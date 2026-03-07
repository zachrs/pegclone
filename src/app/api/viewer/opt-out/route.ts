import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, recipients, messageEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/viewer/opt-out
 * Handles recipient opt-out from the message viewer.
 * Token-gated: requires valid access token to prevent unauthorized opt-outs.
 */
export async function POST(request: NextRequest) {
  // Issue #25: Require JSON content type to prevent CSRF
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 415 });
  }

  const body = await request.json();
  const { accessToken } = body;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Validate access token to derive messageId and tenantId
  const tokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");

  const [msg] = await db
    .select({
      id: messages.id,
      tenantId: messages.tenantId,
      recipientId: messages.recipientId,
      accessTokenExpiresAt: messages.accessTokenExpiresAt,
    })
    .from(messages)
    .where(eq(messages.accessTokenHash, tokenHash))
    .limit(1);

  if (!msg) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  if (msg.accessTokenExpiresAt && msg.accessTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 403 });
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
    tenantId: msg.tenantId,
    messageId: msg.id,
    eventType: "opened",
    payload: { source: "viewer", action: "opt_out" },
    occurredAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
