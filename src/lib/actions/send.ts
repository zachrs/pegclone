"use server";

import { db } from "@/lib/db";
import { messages, recipients } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import crypto from "crypto";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Send a message to a single recipient.
 * Auto-creates recipient record if not found.
 */
export async function sendMessage(params: {
  recipientContact: string;
  contentBlocks: Array<{ type: "content_item"; content_item_id: string; order: number }>;
  deliveryChannel: "sms" | "email" | "qr_code";
}) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);
  const tenantId = session.user.tenantId;
  const senderId = session.user.id;

  // Determine contact type
  const isEmail = params.recipientContact.includes("@");
  const contactType = isEmail ? "email" : "phone";

  // Find or create recipient
  let recipientId: string;

  if (params.deliveryChannel === "qr_code") {
    // QR code sends don't have a real recipient — create a placeholder
    const [rec] = await db
      .insert(recipients)
      .values({
        tenantId,
        firstName: "",
        lastName: "",
        contact: `qr-${crypto.randomUUID().slice(0, 8)}`,
        contactType: "email",
        lastMessagedAt: new Date(),
      })
      .returning();
    if (!rec) throw new Error("Failed to create recipient");
    recipientId = rec.id;
  } else {
    // Look up existing recipient
    const existing = await db
      .select({ id: recipients.id })
      .from(recipients)
      .where(
        and(
          tenant.eq(recipients.tenantId),
          eq(recipients.contact, params.recipientContact)
        )
      )
      .limit(1);

    if (existing[0]) {
      recipientId = existing[0].id;
      await db
        .update(recipients)
        .set({ lastMessagedAt: new Date() })
        .where(eq(recipients.id, recipientId));
    } else {
      const [newRec] = await db
        .insert(recipients)
        .values({
          tenantId,
          firstName: "",
          lastName: "",
          contact: params.recipientContact,
          contactType: contactType as "email" | "phone",
          lastMessagedAt: new Date(),
        })
        .returning();
      if (!newRec) throw new Error("Failed to create recipient");
      recipientId = newRec.id;
    }
  }

  // Create access token
  const accessToken = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create message
  const [message] = await db
    .insert(messages)
    .values({
      tenantId,
      senderId,
      recipientId,
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued",
      sentAt: new Date(),
      accessTokenHash: hashToken(accessToken),
      accessTokenExpiresAt: expiresAt,
    })
    .returning();
  if (!message) throw new Error("Failed to create message");

  // In production: enqueue delivery job via pg-boss here.
  // For now, simulate delivery by marking as delivered after insert.
  await db
    .update(messages)
    .set({
      status: "delivered",
      deliveredAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(messages.id, message.id));

  return { messageId: message.id, accessToken };
}

/**
 * Bulk send to multiple recipients from parsed CSV data.
 */
export async function bulkSend(params: {
  contacts: string[];
  contentBlocks: Array<{ type: "content_item"; content_item_id: string; order: number }>;
}) {
  const results: { contact: string; messageId: string }[] = [];

  for (const contact of params.contacts) {
    const isEmail = contact.includes("@");
    const channel = isEmail ? "email" : "sms";

    const result = await sendMessage({
      recipientContact: contact,
      contentBlocks: params.contentBlocks,
      deliveryChannel: channel as "email" | "sms",
    });

    results.push({ contact, messageId: result.messageId });
  }

  return results;
}
