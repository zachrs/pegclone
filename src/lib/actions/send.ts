"use server";

import { db } from "@/lib/db";
import { messages, recipients, bulkSends } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import crypto from "crypto";
import { enqueueDelivery } from "@/lib/jobs/enqueue";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Send a message to a single recipient.
 * Auto-creates recipient record if not found.
 * Enqueues delivery via pg-boss for actual SMS/email dispatch.
 */
export async function sendMessage(params: {
  recipientContact: string;
  contentBlocks: Array<{ type: "content_item"; content_item_id: string; order: number }>;
  deliveryChannel: "sms" | "email" | "qr_code";
  scheduledAt?: Date;
  bulkSendId?: string;
  reminders?: {
    enabled: boolean;
    maxReminders: number;
    intervalHours: number;
  };
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

  // Create message record in "queued" state
  const [message] = await db
    .insert(messages)
    .values({
      tenantId,
      senderId,
      recipientId,
      bulkSendId: params.bulkSendId ?? null,
      contentBlocks: params.contentBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued",
      scheduledAt: params.scheduledAt ?? null,
      accessTokenHash: hashToken(accessToken),
      accessTokenExpiresAt: expiresAt,
    })
    .returning();
  if (!message) throw new Error("Failed to create message");

  // Enqueue for async delivery (email/sms only — QR doesn't need delivery)
  if (params.deliveryChannel !== "qr_code") {
    try {
      await enqueueDelivery({
        messageId: message.id,
        tenantId,
        recipientContact: params.recipientContact,
        deliveryChannel: params.deliveryChannel as "email" | "sms",
        accessToken,
        scheduledAt: params.scheduledAt,
        reminders: params.reminders,
      });
    } catch (err) {
      // If queue is unavailable (e.g., dev/no DB), fall back to direct delivery
      console.warn("[send] pg-boss unavailable, falling back to direct delivery:", err);
      await directDeliver(message.id, params.recipientContact, params.deliveryChannel as "email" | "sms", accessToken);
    }
  } else {
    // QR code messages are immediately "delivered" (printable)
    await db
      .update(messages)
      .set({
        status: "delivered",
        sentAt: new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, message.id));
  }

  return { messageId: message.id, accessToken };
}

/**
 * Direct delivery fallback when pg-boss is not available.
 * Sends synchronously and updates message status.
 */
async function directDeliver(
  messageId: string,
  recipientContact: string,
  channel: "email" | "sms",
  accessToken: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const viewerUrl = `${baseUrl}/m/${accessToken}`;

  let result: { success: boolean; error?: string };

  if (channel === "email") {
    const { sendEmail } = await import("@/lib/delivery/email");
    result = await sendEmail({
      to: recipientContact,
      subject: "Your provider has shared health information with you",
      text: `Your provider has shared health information with you. View it here: ${viewerUrl}`,
    });
  } else {
    const { sendSms } = await import("@/lib/delivery/sms");
    result = await sendSms({
      to: recipientContact,
      body: `Your provider has shared health information with you. View it here: ${viewerUrl}`,
    });
  }

  if (result.success) {
    await db
      .update(messages)
      .set({
        status: "delivered",
        sentAt: new Date(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  } else {
    await db
      .update(messages)
      .set({
        status: "failed",
        deliveryError: result.error ?? "Unknown error",
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }
}

/**
 * Bulk send to multiple recipients from parsed CSV data.
 * Creates a bulk_sends campaign record and links all messages to it.
 */
export async function bulkSend(params: {
  contacts: string[];
  contentBlocks: Array<{ type: "content_item"; content_item_id: string; order: number }>;
  name?: string;
  deliveryChannel?: "sms" | "email" | "sms_and_email";
  reminders?: {
    enabled: boolean;
    maxReminders: number;
    intervalHours: number;
  };
}) {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  // Determine dominant channel for campaign record
  const channelForCampaign = params.deliveryChannel ?? "email";

  // Create bulk send campaign record
  const [campaign] = await db
    .insert(bulkSends)
    .values({
      tenantId,
      createdBy: session.user.id,
      name: params.name || `Bulk Send - ${new Date().toLocaleDateString()}`,
      contentBlocks: params.contentBlocks,
      deliveryChannel: channelForCampaign,
      totalRecipients: params.contacts.length,
      status: "sending",
      sentAt: new Date(),
    })
    .returning();

  if (!campaign) throw new Error("Failed to create bulk send campaign");

  const results: { contact: string; messageId: string }[] = [];

  for (const contact of params.contacts) {
    const isEmail = contact.includes("@");
    let channel: "email" | "sms" = isEmail ? "email" : "sms";

    // Override channel if explicitly set (and not sms_and_email)
    if (params.deliveryChannel === "email") channel = "email";
    if (params.deliveryChannel === "sms") channel = "sms";

    const result = await sendMessage({
      recipientContact: contact,
      contentBlocks: params.contentBlocks,
      deliveryChannel: channel,
      bulkSendId: campaign.id,
      reminders: params.reminders,
    });

    results.push({ contact, messageId: result.messageId });

    // For sms_and_email, send a second message via the other channel
    if (params.deliveryChannel === "sms_and_email") {
      const otherChannel: "email" | "sms" = channel === "email" ? "sms" : "email";
      await sendMessage({
        recipientContact: contact,
        contentBlocks: params.contentBlocks,
        deliveryChannel: otherChannel,
        bulkSendId: campaign.id,
        reminders: params.reminders,
      });
    }
  }

  // Mark campaign as completed
  await db
    .update(bulkSends)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(bulkSends.id, campaign.id));

  return results;
}
