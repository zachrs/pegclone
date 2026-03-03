"use server";

import { db } from "@/lib/db";
import { messages, recipients } from "@/drizzle/schema";
import { eq, and, desc, sql, ilike } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";

export interface RecipientSummary {
  contact: string;
  contactType: string;
  messageCount: number;
  lastMessagedAt: string | null;
  lastOpenedAt: string | null;
}

/**
 * Get aggregated recipient list (send history grouped by contact).
 */
export async function getRecipients(search?: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const baseWhere = tenant.eq(recipients.tenantId);
  const searchWhere = search
    ? and(baseWhere, ilike(recipients.contact, `%${search}%`))
    : baseWhere;

  const recs = await db
    .select({
      id: recipients.id,
      contact: recipients.contact,
      contactType: recipients.contactType,
      lastMessagedAt: recipients.lastMessagedAt,
    })
    .from(recipients)
    .where(searchWhere)
    .orderBy(desc(recipients.lastMessagedAt));

  // For each recipient, get message stats
  const result: RecipientSummary[] = [];
  for (const rec of recs) {
    // Skip QR code placeholder recipients
    if (rec.contact.startsWith("qr-")) continue;

    const stats = await db
      .select({
        count: sql<number>`count(*)::int`,
        lastOpened: sql<string | null>`max(${messages.openedAt})`,
      })
      .from(messages)
      .where(
        and(
          tenant.eq(messages.tenantId),
          eq(messages.recipientId, rec.id)
        )
      );

    result.push({
      contact: rec.contact,
      contactType: rec.contactType,
      messageCount: stats[0]?.count ?? 0,
      lastMessagedAt: rec.lastMessagedAt?.toISOString() ?? null,
      lastOpenedAt: stats[0]?.lastOpened ?? null,
    });
  }

  return result;
}

/**
 * Get message history for a specific contact.
 */
export async function getMessagesForContact(contact: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Find recipient
  const [rec] = await db
    .select({ id: recipients.id })
    .from(recipients)
    .where(
      and(tenant.eq(recipients.tenantId), eq(recipients.contact, contact))
    )
    .limit(1);

  if (!rec) return [];

  return db
    .select({
      id: messages.id,
      deliveryChannel: messages.deliveryChannel,
      contentBlocks: messages.contentBlocks,
      status: messages.status,
      sentAt: messages.sentAt,
      deliveredAt: messages.deliveredAt,
      openedAt: messages.openedAt,
    })
    .from(messages)
    .where(
      and(tenant.eq(messages.tenantId), eq(messages.recipientId, rec.id))
    )
    .orderBy(desc(messages.sentAt));
}
