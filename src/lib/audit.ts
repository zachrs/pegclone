"use server";

import { db } from "@/lib/db";
import { auditLogs } from "@/drizzle/schema";

/**
 * Log an audit event for admin actions and message activities.
 * Covers #32 (admin audit logging) and robust message activity tracking.
 */
export async function logAudit(params: {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      tenantId: params.tenantId ?? null,
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      details: params.details ?? {},
      ipAddress: params.ipAddress ?? null,
      occurredAt: new Date(),
    });
  } catch (err) {
    // Audit logging should never break the main flow
    console.error("[audit] Failed to log:", err);
  }
}
