"use server";

import { db } from "@/lib/db";
import { messages, recipients } from "@/drizzle/schema";
import { eq, and, desc, sql, ilike, ne } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";

export interface RecipientSummary {
  contact: string;
  contactType: string;
  messageCount: number;
  lastMessagedAt: string | null;
  lastOpenedAt: string | null;
}

export interface PaginatedRecipients {
  items: RecipientSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Get aggregated recipient list with pagination (Fix #31).
 * Single query with LEFT JOIN instead of N+1.
 */
export async function getRecipients(search?: string, page = 1, pageSize = 50): Promise<PaginatedRecipients> {
  const session = await requireSession();
  const tenantId = session.user.tenantId;
  const offset = (page - 1) * pageSize;

  const searchClause = search
    ? sql`and r.contact ilike ${"%" + search + "%"}`
    : sql``;

  // Single query with aggregated stats — replaces N+1
  const rows = await db.execute(sql`
    select
      r.contact,
      r.contact_type,
      r.last_messaged_at,
      coalesce(s.msg_count, 0)::int as message_count,
      s.last_opened
    from recipients r
    left join lateral (
      select
        count(*)::int as msg_count,
        max(m.opened_at) as last_opened
      from messages m
      where m.recipient_id = r.id and m.tenant_id = ${tenantId}
    ) s on true
    where r.tenant_id = ${tenantId}
      and r.contact not like 'qr-%'
      ${searchClause}
    order by r.last_messaged_at desc nulls last
    limit ${pageSize}
    offset ${offset}
  `);

  // Count total (for pagination)
  const [countResult] = await db.execute(sql`
    select count(*)::int as total
    from recipients r
    where r.tenant_id = ${tenantId}
      and r.contact not like 'qr-%'
      ${searchClause}
  `);

  const items = (rows as unknown as Array<Record<string, unknown>>).map((r) => ({
    contact: String(r.contact),
    contactType: String(r.contact_type),
    messageCount: Number(r.message_count),
    lastMessagedAt: r.last_messaged_at ? new Date(r.last_messaged_at as string).toISOString() : null,
    lastOpenedAt: r.last_opened ? new Date(r.last_opened as string).toISOString() : null,
  }));

  return {
    items,
    total: (countResult as unknown as { total: number })?.total ?? 0,
    page,
    pageSize,
  };
}

/**
 * Search existing recipients (for the send flow roster search).
 */
export async function searchRecipients(query: string) {
  if (!query || query.length < 2) return [];
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const recs = await db
    .select({
      id: recipients.id,
      firstName: recipients.firstName,
      lastName: recipients.lastName,
      contact: recipients.contact,
      contactType: recipients.contactType,
    })
    .from(recipients)
    .where(
      and(
        tenant.eq(recipients.tenantId),
        sql`(${recipients.contact} ILIKE ${"%" + query + "%"} OR ${recipients.firstName} ILIKE ${"%" + query + "%"} OR ${recipients.lastName} ILIKE ${"%" + query + "%"})`,
      )
    )
    .limit(10);

  return recs.filter((r) => !r.contact.startsWith("qr-"));
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
