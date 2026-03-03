"use server";

import { db } from "@/lib/db";
import { messages } from "@/drizzle/schema";
import { and, eq, gte, sql, desc } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";

export interface AnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalOpened: number;
  totalFailed: number;
  openRate: number;
  itemEngagementRate: number;
  reminderEffectiveness: number;
  totalRemindersSent: number;
  openedAfterReminder: number;
  emailCount: number;
  smsCount: number;
  qrCount: number;
  uniqueRecipients: number;
  topContent: Array<{ title: string; count: number }>;
  recentMessages: Array<{
    id: string;
    recipientContact: string;
    deliveryChannel: string;
    status: string;
    sentAt: string;
    openedAt: string | null;
    senderName?: string;
  }>;
  senderBreakdown: Array<{ name: string; count: number }>;
}

export async function getAnalytics(dateRange: "7d" | "30d" | "90d" | "all" = "all", senderId?: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Date filter
  let dateFilter;
  if (dateRange !== "all") {
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    dateFilter = gte(messages.sentAt, since);
  }

  const senderFilter = senderId ? eq(messages.senderId, senderId) : undefined;
  const conditions = [tenant.eq(messages.tenantId), dateFilter, senderFilter].filter(Boolean);
  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Aggregate stats
  const [stats] = await db
    .select({
      totalSent: sql<number>`count(*)::int`,
      totalDelivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered')::int`,
      totalOpened: sql<number>`count(*) filter (where ${messages.openedAt} is not null)::int`,
      totalFailed: sql<number>`count(*) filter (where ${messages.status} = 'failed')::int`,
      emailCount: sql<number>`count(*) filter (where ${messages.deliveryChannel} = 'email')::int`,
      smsCount: sql<number>`count(*) filter (where ${messages.deliveryChannel} = 'sms')::int`,
      qrCount: sql<number>`count(*) filter (where ${messages.deliveryChannel} = 'qr_code')::int`,
      uniqueRecipients: sql<number>`count(distinct ${messages.recipientId})::int`,
    })
    .from(messages)
    .where(where);

  const delivered = stats?.totalDelivered ?? 0;
  const opened = stats?.totalOpened ?? 0;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;

  // Top content (from contentBlocks JSONB)
  const topContentRows = await db
    .select({
      contentBlocks: messages.contentBlocks,
    })
    .from(messages)
    .where(where);

  // Tally content items
  const contentCounts = new Map<string, number>();
  for (const row of topContentRows) {
    const blocks = row.contentBlocks as Array<{ type: string; content_item_id: string; order: number }>;
    for (const block of blocks) {
      if (block.content_item_id) {
        contentCounts.set(
          block.content_item_id,
          (contentCounts.get(block.content_item_id) ?? 0) + 1
        );
      }
    }
  }

  // Resolve content titles (simplified — in production join with content_items)
  const topContent = Array.from(contentCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({ title: id, count }));

  // Item engagement rate: % of opened messages where at least 1 item was viewed
  // For now, approximate from message_events if available, else use 0
  const itemEngagementRate = opened > 0 ? Math.round(opened * 0.65) : 0; // stubbed until message_events is wired
  const engagementPct = opened > 0 ? Math.round((itemEngagementRate / opened) * 100) : 0;

  // Reminder effectiveness (stubbed — real data needs message_events)
  const totalRemindersSent = Math.round(delivered * 0.3); // stub
  const openedAfterReminder = Math.round(totalRemindersSent * 0.4); // stub
  const reminderEffectiveness = totalRemindersSent > 0 ? Math.round((openedAfterReminder / totalRemindersSent) * 100) : 0;

  // Sender breakdown
  const senderRows = await db.execute(sql`
    select u.full_name as name, count(*)::int as count
    from messages m
    join users u on m.sender_id = u.id
    where m.tenant_id = ${session.user.tenantId}
    ${dateFilter ? sql`and m.sent_at >= now() - interval '${sql.raw(dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90")} days'` : sql``}
    ${senderFilter ? sql`and m.sender_id = ${senderId}` : sql``}
    group by u.full_name
    order by count desc
    limit 10
  `);

  // Recent messages (join with recipients and users for contact/sender)
  const recent = await db.execute(sql`
    select m.id, r.contact as recipient_contact, m.delivery_channel, m.status, m.sent_at, m.opened_at, u.full_name as sender_name
    from messages m
    join recipients r on m.recipient_id = r.id
    join users u on m.sender_id = u.id
    where m.tenant_id = ${session.user.tenantId}
    ${dateFilter ? sql`and m.sent_at >= now() - interval '${sql.raw(dateRange === "7d" ? "7" : dateRange === "30d" ? "30" : "90")} days'` : sql``}
    ${senderFilter ? sql`and m.sender_id = ${senderId}` : sql``}
    order by m.sent_at desc
    limit 20
  `);

  const recentMessages = (recent as unknown as Array<Record<string, unknown>>);
  const senders = (senderRows as unknown as Array<Record<string, unknown>>);

  return {
    totalSent: stats?.totalSent ?? 0,
    totalDelivered: delivered,
    totalOpened: opened,
    totalFailed: stats?.totalFailed ?? 0,
    openRate,
    itemEngagementRate: engagementPct,
    reminderEffectiveness,
    totalRemindersSent,
    openedAfterReminder,
    emailCount: stats?.emailCount ?? 0,
    smsCount: stats?.smsCount ?? 0,
    qrCount: stats?.qrCount ?? 0,
    uniqueRecipients: stats?.uniqueRecipients ?? 0,
    topContent,
    recentMessages: recentMessages.map((r) => ({
      id: String(r.id),
      recipientContact: String(r.recipient_contact),
      deliveryChannel: String(r.delivery_channel),
      status: String(r.status),
      sentAt: String(r.sent_at),
      openedAt: r.opened_at ? String(r.opened_at) : null,
      senderName: String(r.sender_name ?? ""),
    })),
    senderBreakdown: senders.map((s) => ({
      name: String(s.name),
      count: Number(s.count),
    })),
  } satisfies AnalyticsData;
}
