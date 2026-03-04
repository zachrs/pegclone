import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, messageEvents } from "@/drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { validateTwilioSignature } from "@/lib/delivery/sms";

/**
 * Twilio SMS status callback webhook.
 *
 * Twilio POSTs to this URL when an SMS status changes
 * (queued → sent → delivered / failed / undelivered).
 *
 * Docs: https://www.twilio.com/docs/messaging/guides/track-outbound-message-status
 */
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = String(value);
  });

  // Validate signature in production
  if (process.env.NODE_ENV === "production") {
    const signature = request.headers.get("x-twilio-signature") ?? "";
    const url =
      process.env.TWILIO_STATUS_CALLBACK_URL ??
      `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;

    if (!validateTwilioSignature(signature, url, params)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 403 }
      );
    }
  }

  const messageSid = params.MessageSid;
  const messageStatus = params.MessageStatus; // queued, sent, delivered, undelivered, failed
  const errorCode = params.ErrorCode;

  if (!messageSid || !messageStatus) {
    return NextResponse.json(
      { error: "Missing MessageSid or MessageStatus" },
      { status: 400 }
    );
  }

  // Map Twilio status to our message status
  const statusMap: Record<string, string> = {
    queued: "queued",
    sent: "sent",
    delivered: "delivered",
    undelivered: "failed",
    failed: "failed",
  };

  const mappedStatus = statusMap[messageStatus];
  if (!mappedStatus) {
    // Unknown status — acknowledge but don't process
    return NextResponse.json({ received: true });
  }

  // Fix #20: Direct JSONB query instead of O(n^2) scan
  const [matchedEvent] = await db
    .select({
      messageId: messageEvents.messageId,
      tenantId: messageEvents.tenantId,
    })
    .from(messageEvents)
    .where(
      sql`${messageEvents.eventType} = 'sent' AND ${messageEvents.payload}->>'sid' = ${messageSid}`
    )
    .limit(1);

  if (matchedEvent) {
    const matchedMessageId = matchedEvent.messageId;
    const matchedTenantId = matchedEvent.tenantId;
    // Update message status
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (mappedStatus === "delivered") {
      updateData.status = "delivered";
      updateData.deliveredAt = new Date();
    } else if (mappedStatus === "failed") {
      updateData.status = "failed";
      updateData.deliveryError = errorCode
        ? `Twilio error ${errorCode}: ${messageStatus}`
        : `SMS ${messageStatus}`;
    } else {
      updateData.status = mappedStatus;
    }

    await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, matchedMessageId));

    // Log event
    await db.insert(messageEvents).values({
      tenantId: matchedTenantId,
      messageId: matchedMessageId,
      eventType: mappedStatus === "delivered" ? "delivered" : "failed",
      payload: {
        twilioStatus: messageStatus,
        sid: messageSid,
        errorCode: errorCode ?? null,
      },
      occurredAt: new Date(),
    });
  }

  // Always return 200 so Twilio doesn't retry
  return NextResponse.json({ received: true });
}
