import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messageEvents } from "@/drizzle/schema";

/**
 * POST /api/viewer/event
 * Logs viewer events (item_viewed) for audit trail.
 * Token-gated, not session-gated.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { messageId, tenantId, contentItemId, eventType } = body;

  if (!messageId || !tenantId || !eventType) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await db.insert(messageEvents).values({
    tenantId,
    messageId,
    eventType: eventType as "item_viewed",
    contentItemId: contentItemId ?? null,
    payload: { source: "viewer" },
    occurredAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
