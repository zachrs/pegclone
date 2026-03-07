import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { messages, recipients, messageEvents } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiSuccess, apiError } from "@/lib/utils/api";

/**
 * POST /api/viewer/opt-out
 * Handles recipient opt-out from the message viewer.
 * Token-gated: requires valid access token to prevent unauthorized opt-outs.
 */
export async function POST(request: NextRequest) {
  // Issue #10: Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`viewer-optout:${ip}`, 10, 60_000)) {
    return apiError("Too many requests", 429);
  }

  // Issue #25: Require JSON content type to prevent CSRF
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return apiError("Content-Type must be application/json", 415);
  }

  const body = await request.json();
  const { accessToken } = body;

  if (!accessToken) {
    return apiError("Missing token");
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
    return apiError("Invalid token", 403);
  }

  if (msg.accessTokenExpiresAt && msg.accessTokenExpiresAt < new Date()) {
    return apiError("Token expired", 403);
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

  return apiSuccess();
}
