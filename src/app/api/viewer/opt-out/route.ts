import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, recipients, messageEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/viewer/opt-out
 * Handles recipient opt-out from the message viewer.
 * Sets optedOut=true on the recipient record.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messageId, tenantId } = body;

  if (!messageId || !tenantId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Look up the message to find the recipient
  const [msg] = await db
    .select({ recipientId: messages.recipientId })
    .from(messages)
    .where(eq(messages.id, messageId))
    .limit(1);

  if (!msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  // Mark recipient as opted out
  await db
    .update(recipients)
    .set({
      optedOut: true,
      optedOutAt: new Date(),
    })
    .where(eq(recipients.id, msg.recipientId));

  // Log audit event
  await db.insert(messageEvents).values({
    tenantId,
    messageId,
    eventType: "opened", // Re-use opened for now; semantically this is opt-out
    payload: { source: "viewer", action: "opt_out" },
    occurredAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
