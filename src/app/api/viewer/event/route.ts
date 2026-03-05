import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, messageEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * POST /api/viewer/event
 * Logs viewer events (item_viewed) for audit trail.
 * Token-gated: requires valid access token to prevent forged events.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accessToken, contentItemId, eventType } = body;

  if (!accessToken || !eventType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Validate access token to derive messageId and tenantId
  const tokenHash = crypto.createHash("sha256").update(accessToken).digest("hex");

  const [msg] = await db
    .select({
      id: messages.id,
      tenantId: messages.tenantId,
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

  await db.insert(messageEvents).values({
    tenantId: msg.tenantId,
    messageId: msg.id,
    eventType: eventType as "item_viewed",
    contentItemId: contentItemId ?? null,
    payload: { source: "viewer" },
    occurredAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
