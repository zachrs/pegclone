"use server";

import { db } from "@/lib/db";
import { bulkSends, messages, recipients } from "@/drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";

export interface CampaignSummary {
  id: string;
  name: string;
  deliveryChannel: string;
  totalRecipients: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  // Aggregated stats
  delivered: number;
  failed: number;
  opened: number;
  deliveryRate: number;
  openRate: number;
}

export interface CampaignDetail {
  id: string;
  name: string;
  deliveryChannel: string;
  totalRecipients: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  contentBlocks: Array<{ type: string; content_item_id: string; order: number }>;
  // Aggregated stats
  totalSent: number;
  delivered: number;
  failed: number;
  opened: number;
  deliveryRate: number;
  openRate: number;
  // Per-recipient breakdown
  recipientBreakdown: Array<{
    contact: string;
    contactType: string;
    status: string;
    deliveryChannel: string;
    sentAt: string | null;
    deliveredAt: string | null;
    openedAt: string | null;
  }>;
}

/**
 * Get all campaigns (bulk sends) for the current org with aggregated stats.
 */
export async function getCampaigns(): Promise<CampaignSummary[]> {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const campaigns = await db
    .select()
    .from(bulkSends)
    .where(tenant.eq(bulkSends.tenantId))
    .orderBy(desc(bulkSends.createdAt));

  const result: CampaignSummary[] = [];

  for (const c of campaigns) {
    const [stats] = await db
      .select({
        delivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered')::int`,
        failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')::int`,
        opened: sql<number>`count(*) filter (where ${messages.openedAt} is not null)::int`,
      })
      .from(messages)
      .where(and(tenant.eq(messages.tenantId), eq(messages.bulkSendId, c.id)));

    const delivered = stats?.delivered ?? 0;
    const opened = stats?.opened ?? 0;

    result.push({
      id: c.id,
      name: c.name,
      deliveryChannel: c.deliveryChannel,
      totalRecipients: c.totalRecipients,
      status: c.status,
      sentAt: c.sentAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      delivered,
      failed: stats?.failed ?? 0,
      opened,
      deliveryRate: c.totalRecipients > 0 ? Math.round((delivered / c.totalRecipients) * 100) : 0,
      openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    });
  }

  return result;
}

/**
 * Get detailed campaign info with per-recipient breakdown.
 */
export async function getCampaignDetail(campaignId: string): Promise<CampaignDetail | null> {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const [campaign] = await db
    .select()
    .from(bulkSends)
    .where(and(tenant.eq(bulkSends.tenantId), eq(bulkSends.id, campaignId)))
    .limit(1);

  if (!campaign) return null;

  // Aggregated stats
  const [stats] = await db
    .select({
      totalSent: sql<number>`count(*)::int`,
      delivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered')::int`,
      failed: sql<number>`count(*) filter (where ${messages.status} = 'failed')::int`,
      opened: sql<number>`count(*) filter (where ${messages.openedAt} is not null)::int`,
    })
    .from(messages)
    .where(and(tenant.eq(messages.tenantId), eq(messages.bulkSendId, campaignId)));

  const delivered = stats?.delivered ?? 0;
  const opened = stats?.opened ?? 0;

  // Per-recipient breakdown
  const rows = await db
    .select({
      contact: recipients.contact,
      contactType: recipients.contactType,
      status: messages.status,
      deliveryChannel: messages.deliveryChannel,
      sentAt: messages.sentAt,
      deliveredAt: messages.deliveredAt,
      openedAt: messages.openedAt,
    })
    .from(messages)
    .innerJoin(recipients, eq(messages.recipientId, recipients.id))
    .where(and(tenant.eq(messages.tenantId), eq(messages.bulkSendId, campaignId)))
    .orderBy(desc(messages.sentAt));

  return {
    id: campaign.id,
    name: campaign.name,
    deliveryChannel: campaign.deliveryChannel,
    totalRecipients: campaign.totalRecipients,
    status: campaign.status,
    sentAt: campaign.sentAt?.toISOString() ?? null,
    createdAt: campaign.createdAt.toISOString(),
    contentBlocks: campaign.contentBlocks,
    totalSent: stats?.totalSent ?? 0,
    delivered,
    failed: stats?.failed ?? 0,
    opened,
    deliveryRate: campaign.totalRecipients > 0 ? Math.round((delivered / campaign.totalRecipients) * 100) : 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    recipientBreakdown: rows.map((r) => ({
      contact: r.contact,
      contactType: r.contactType,
      status: r.status,
      deliveryChannel: r.deliveryChannel,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      openedAt: r.openedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Get analytics scoped to a specific campaign.
 */
export async function getCampaignAnalytics(campaignId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const [stats] = await db
    .select({
      totalSent: sql<number>`count(*)::int`,
      totalDelivered: sql<number>`count(*) filter (where ${messages.status} = 'delivered')::int`,
      totalOpened: sql<number>`count(*) filter (where ${messages.openedAt} is not null)::int`,
      totalFailed: sql<number>`count(*) filter (where ${messages.status} = 'failed')::int`,
      emailCount: sql<number>`count(*) filter (where ${messages.deliveryChannel} = 'email')::int`,
      smsCount: sql<number>`count(*) filter (where ${messages.deliveryChannel} = 'sms')::int`,
      uniqueRecipients: sql<number>`count(distinct ${messages.recipientId})::int`,
    })
    .from(messages)
    .where(and(tenant.eq(messages.tenantId), eq(messages.bulkSendId, campaignId)));

  const delivered = stats?.totalDelivered ?? 0;
  const opened = stats?.totalOpened ?? 0;

  return {
    totalSent: stats?.totalSent ?? 0,
    totalDelivered: delivered,
    totalOpened: opened,
    totalFailed: stats?.totalFailed ?? 0,
    openRate: delivered > 0 ? Math.round((opened / delivered) * 100) : 0,
    deliveryRate: (stats?.totalSent ?? 0) > 0 ? Math.round((delivered / (stats?.totalSent ?? 1)) * 100) : 0,
    emailCount: stats?.emailCount ?? 0,
    smsCount: stats?.smsCount ?? 0,
    uniqueRecipients: stats?.uniqueRecipients ?? 0,
  };
}
