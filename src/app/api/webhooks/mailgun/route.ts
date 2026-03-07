import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, messageEvents } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

/**
 * Mailgun event webhook.
 *
 * Mailgun POSTs event data when email delivery status changes
 * (delivered, failed, opened, etc.).
 *
 * Docs: https://documentation.mailgun.com/docs/mailgun/api-reference/openapi-final/tag/Webhooks/
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Issue #5: Verify webhook signature in production (fail closed)
  if (process.env.NODE_ENV === "production") {
    const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
    if (!signingKey) {
      console.error("[mailgun-webhook] MAILGUN_WEBHOOK_SIGNING_KEY is not set");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const { timestamp, token, signature } = body.signature ?? {};
    if (!timestamp || !token || !signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 403 });
    }

    const hmac = crypto
      .createHmac("sha256", signingKey)
      .update(timestamp + token)
      .digest("hex");

    if (hmac !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
  }

  const eventData = body["event-data"] ?? body;
  const event = eventData.event; // delivered, failed, opened, clicked, etc.
  const messageId = eventData["user-variables"]?.pegMessageId;

  if (!event) {
    return NextResponse.json({ received: true });
  }

  if (messageId) {
    const eventMap: Record<string, string> = {
      delivered: "delivered",
      failed: "failed",
      rejected: "failed",
      opened: "opened",
    };

    const mappedEvent = eventMap[event];
    if (mappedEvent) {
      // Get message's tenant for event logging
      const [msg] = await db
        .select({ tenantId: messages.tenantId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (msg) {
        // Update message status
        if (mappedEvent === "delivered") {
          await db
            .update(messages)
            .set({ status: "delivered", deliveredAt: new Date(), updatedAt: new Date() })
            .where(eq(messages.id, messageId));
        } else if (mappedEvent === "failed") {
          const reason = eventData["delivery-status"]?.description ?? event;
          await db
            .update(messages)
            .set({ status: "failed", deliveryError: String(reason), updatedAt: new Date() })
            .where(eq(messages.id, messageId));
        } else if (mappedEvent === "opened") {
          await db
            .update(messages)
            .set({ openedAt: new Date(), updatedAt: new Date() })
            .where(eq(messages.id, messageId));
        }

        // Log event
        await db.insert(messageEvents).values({
          tenantId: msg.tenantId,
          messageId,
          eventType: mappedEvent as "delivered" | "failed" | "opened",
          payload: {
            mailgunEvent: event,
            recipient: eventData.recipient,
            deliveryStatus: eventData["delivery-status"] ?? null,
          },
          occurredAt: new Date(),
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
