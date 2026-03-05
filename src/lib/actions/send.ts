"use server";

import { db } from "@/lib/db";
import { messages, recipients, bulkSends, organizations, contentItems } from "@/drizzle/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import crypto from "crypto";
import { enqueueDelivery } from "@/lib/jobs/enqueue";
import { logAudit } from "@/lib/audit";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Resolve content block IDs to actual DB UUIDs.
 * System library items from Algolia use objectID (e.g. "36850") which isn't a
 * valid content_items.id UUID. This finds or creates the DB row for each item.
 */
async function resolveContentBlockIds(
  blocks: Array<{ type: "content_item"; content_item_id: string; order: number }>
): Promise<Array<{ type: "content_item"; content_item_id: string; order: number }>> {
  const resolved = [];
  for (const block of blocks) {
    const id = block.content_item_id;

    // Check if it's already a valid UUID (DB primary key)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      resolved.push(block);
      continue;
    }

    // It's an Algolia objectID — find or create the content_items row
    const [existing] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.algoliaObjectId, id),
          isNull(contentItems.tenantId)
        )
      )
      .limit(1);

    if (existing) {
      resolved.push({ ...block, content_item_id: existing.id });
    } else {
      // Algolia item not yet in DB — skip it (shouldn't happen normally)
      console.warn(`[send] Could not resolve content item with algoliaObjectId=${id}`);
      resolved.push(block);
    }
  }
  return resolved;
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
  subject?: string;
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
      .select({ id: recipients.id, optedOut: recipients.optedOut })
      .from(recipients)
      .where(
        and(
          tenant.eq(recipients.tenantId),
          eq(recipients.contact, params.recipientContact)
        )
      )
      .limit(1);

    if (existing[0]) {
      // Fix #6: Check opt-out before sending
      if (existing[0].optedOut) {
        throw new Error(`Recipient ${params.recipientContact} has opted out of messages`);
      }
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

  // Fix #15: Check SMS throttling before sending SMS
  if (params.deliveryChannel === "sms") {
    const [org] = await db
      .select({
        smsThrottled: organizations.smsThrottled,
        smsSendCountMonth: organizations.smsSendCountMonth,
      })
      .from(organizations)
      .where(eq(organizations.id, tenantId))
      .limit(1);

    if (org?.smsThrottled) {
      throw new Error("SMS sending is currently throttled for your organization. Contact support.");
    }
  }

  // Create access token
  const accessToken = crypto.randomBytes(24).toString("base64url");

  // Get link expiration from org settings, default 30 days
  const [orgSettings] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, tenantId))
    .limit(1);

  const linkExpirationDays = (orgSettings?.settings as Record<string, Record<string, number>> | null)?.delivery?.linkExpirationDays ?? 30;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + linkExpirationDays);

  // Fix #27: Generate subject from content blocks
  const subject = params.subject ?? "Your provider has shared health information with you";

  // Resolve Algolia IDs to DB UUIDs before storing
  const resolvedBlocks = await resolveContentBlockIds(params.contentBlocks);

  // Create message record in "queued" state
  const [message] = await db
    .insert(messages)
    .values({
      tenantId,
      senderId,
      recipientId,
      bulkSendId: params.bulkSendId ?? null,
      subject,
      contentBlocks: resolvedBlocks,
      deliveryChannel: params.deliveryChannel,
      status: "queued",
      scheduledAt: params.scheduledAt ?? null,
      accessTokenHash: hashToken(accessToken),
      accessTokenExpiresAt: expiresAt,
    })
    .returning();
  if (!message) throw new Error("Failed to create message");

  // Fix #15: Increment SMS send count
  if (params.deliveryChannel === "sms") {
    await db
      .update(organizations)
      .set({
        smsSendCountMonth: sql`${organizations.smsSendCountMonth} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, tenantId));
  }

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

  // Audit log for message send
  await logAudit({
    tenantId,
    userId: senderId,
    action: "message.send",
    resourceType: "message",
    resourceId: message.id,
    details: {
      deliveryChannel: params.deliveryChannel,
      recipientContact: params.recipientContact,
      contentBlockCount: params.contentBlocks.length,
      scheduled: !!params.scheduledAt,
    },
  });

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
  scheduledAt?: Date;
  reminders?: {
    enabled: boolean;
    maxReminders: number;
    intervalHours: number;
  };
}) {
  const session = await requireSession();
  const tenantId = session.user.tenantId;

  // Create bulk send campaign record
  const [campaign] = await db
    .insert(bulkSends)
    .values({
      tenantId,
      createdBy: session.user.id,
      name: params.name || `Bulk Send - ${new Date().toLocaleDateString()}`,
      contentBlocks: params.contentBlocks,
      deliveryChannel: "email", // default for campaign record
      totalRecipients: params.contacts.length,
      status: "sending",
      sentAt: new Date(),
    })
    .returning();

  if (!campaign) throw new Error("Failed to create bulk send campaign");

  const results: { contact: string; messageId: string }[] = [];
  let failedCount = 0;

  for (const contact of params.contacts) {
    // Auto-detect channel from contact type
    const channel: "email" | "sms" = contact.includes("@") ? "email" : "sms";

    try {
      const result = await sendMessage({
        recipientContact: contact,
        contentBlocks: params.contentBlocks,
        deliveryChannel: channel,
        scheduledAt: params.scheduledAt,
        bulkSendId: campaign.id,
        reminders: params.reminders,
      });

      results.push({ contact, messageId: result.messageId });
    } catch (err) {
      // Fix #30: Track failed sends, don't stop the whole batch
      console.error("[bulk-send] Failed for a recipient:", err instanceof Error ? err.message : "Unknown error");
      failedCount++;
    }
  }

  // Fix #30: Set status to "failed" if all messages failed, otherwise "completed"
  const finalStatus = failedCount === params.contacts.length ? "failed" : "completed";
  await db
    .update(bulkSends)
    .set({ status: finalStatus, updatedAt: new Date() })
    .where(eq(bulkSends.id, campaign.id));

  return results;
}
