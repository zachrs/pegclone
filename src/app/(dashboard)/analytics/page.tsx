"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAnalytics, type AnalyticsData } from "@/lib/actions/analytics";
import { getCampaigns, type CampaignSummary } from "@/lib/actions/campaigns";
import { getCampaignAnalytics } from "@/lib/actions/campaigns";
import {
  Download,
  Send,
  CircleCheck,
  Eye,
  TrendingUp,
  Zap,
  Bell,
  BarChart3,
  CircleX,
} from "lucide-react";

type DateRange = "7d" | "30d" | "90d" | "all";
type ViewLevel = "org" | "provider";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("all");
  const [viewLevel, setViewLevel] = useState<ViewLevel>("org");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [campaignStats, setCampaignStats] = useState<{
    totalSent: number; totalDelivered: number; totalOpened: number; totalFailed: number;
    openRate: number; deliveryRate: number; emailCount: number; smsCount: number; uniqueRecipients: number;
  } | null>(null);

  useEffect(() => {
    getCampaigns().then(setCampaigns).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCampaign !== "all") {
      getCampaignAnalytics(selectedCampaign)
        .then(setCampaignStats)
        .catch(() => setCampaignStats(null));
    } else {
      setCampaignStats(null);
    }
  }, [selectedCampaign]);

  useEffect(() => {
    getAnalytics(range)
      .then(setData)
      .catch(() => {});
  }, [range]);

  const stats = data ?? {
    totalSent: 0, totalDelivered: 0, totalOpened: 0, totalFailed: 0,
    openRate: 0, itemEngagementRate: 0, reminderEffectiveness: 0,
    totalRemindersSent: 0, openedAfterReminder: 0,
    emailCount: 0, smsCount: 0, qrCount: 0, uniqueRecipients: 0,
    topContent: [], recentMessages: [], senderBreakdown: [],
  };

  // Use campaign-scoped stats if a campaign is selected
  const displayStats = campaignStats ? {
    totalSent: campaignStats.totalSent,
    totalDelivered: campaignStats.totalDelivered,
    totalOpened: campaignStats.totalOpened,
    totalFailed: campaignStats.totalFailed,
    openRate: campaignStats.openRate,
    emailCount: campaignStats.emailCount,
    smsCount: campaignStats.smsCount,
    qrCount: 0,
    uniqueRecipients: campaignStats.uniqueRecipients,
    deliveryRate: campaignStats.deliveryRate,
  } : {
    ...stats,
    deliveryRate: stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0,
  };

  // Fix #18: When a campaign is selected, only export that campaign's data
  const handleExportCSV = () => {
    const headers = ["Recipient", "Channel", "Status", "Sent At", "Opened At", "Sender"];
    // Use campaign-specific data when filtered, otherwise all recent messages
    const exportMessages = selectedCampaign !== "all" ? [] : stats.recentMessages;
    const rows = exportMessages.map((msg) => [
      msg.recipientContact, msg.deliveryChannel, msg.status, msg.sentAt, msg.openedAt ?? "", msg.senderName ?? "",
    ]);

    if (rows.length === 0 && selectedCampaign !== "all") {
      // For campaign-specific export, use the campaign stats (no recipient-level data available from analytics)
      const campaignName = campaigns.find((c) => c.id === selectedCampaign)?.name ?? "campaign";
      const summaryRows = [
        ["Total Sent", String(campaignStats?.totalSent ?? 0), "", "", "", ""],
        ["Delivered", String(campaignStats?.totalDelivered ?? 0), "", "", "", ""],
        ["Opened", String(campaignStats?.totalOpened ?? 0), "", "", "", ""],
        ["Failed", String(campaignStats?.totalFailed ?? 0), "", "", "", ""],
      ];
      const csv = [headers, ...summaryRows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `peg-campaign-${campaignName}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peg-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header title="Analytics" />
      <main className="flex-1 overflow-auto p-6 animate-fade-in-up">
        {/* Controls bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 rounded-xl border bg-muted/50 p-1">
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${viewLevel === "org" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewLevel("org")}
              >
                Org-Level
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${viewLevel === "provider" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewLevel("provider")}
              >
                By Provider
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">
                {selectedCampaign !== "all"
                  ? campaigns.find((c) => c.id === selectedCampaign)?.name ?? "Campaign"
                  : range === "7d" ? "last 7 days" : range === "30d" ? "last 30 days" : range === "90d" ? "last 90 days" : "all time"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {campaigns.length > 0 && (
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key metrics */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Messages Sent" value={displayStats.totalSent} icon={<Send className="h-4 w-4" />} loading={!data} />
          <MetricCard label="Delivered" value={displayStats.totalDelivered} icon={<CircleCheck className="h-4 w-4" />} color="green" loading={!data} />
          <MetricCard label="Opened" value={displayStats.totalOpened} icon={<Eye className="h-4 w-4" />} color="teal" loading={!data} />
          <MetricCard label="Open Rate" value={`${displayStats.openRate}%`} icon={<TrendingUp className="h-4 w-4" />} color="blue" loading={!data} />
          <MetricCard label="Delivery Rate" value={`${displayStats.deliveryRate}%`} icon={<Zap className="h-4 w-4" />} color="purple" loading={!data} />
          <MetricCard label="Reminder Effect." value={campaignStats ? "—" : `${stats.reminderEffectiveness}%`} icon={<Bell className="h-4 w-4" />} color="amber" loading={!data} />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Channel breakdown */}
          <div className="rounded-xl border bg-card p-5 shadow-md">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">By Channel</h2>
            <div className="space-y-3">
              <ChannelBar label="Email" count={displayStats.emailCount} total={displayStats.totalSent} color="bg-violet-500" />
              <ChannelBar label="SMS" count={displayStats.smsCount} total={displayStats.totalSent} color="bg-green-500" />
              {!campaignStats && stats.qrCount > 0 && <ChannelBar label="QR Code" count={stats.qrCount} total={displayStats.totalSent} color="bg-amber-500" />}
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-xl border bg-card p-5 shadow-md">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unique recipients</dt>
                <dd className="font-medium">{displayStats.uniqueRecipients}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivered</dt>
                <dd className="font-medium text-green-600">{displayStats.totalDelivered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Failed</dt>
                <dd className="font-medium text-red-600">{displayStats.totalFailed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Awaiting open</dt>
                <dd className="font-medium text-amber-600">{Math.max(0, displayStats.totalDelivered - displayStats.totalOpened)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="text-muted-foreground">Open rate</dt>
                <dd className="font-semibold text-primary">{displayStats.openRate}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery rate</dt>
                <dd className="font-semibold text-primary">{displayStats.deliveryRate}%</dd>
              </div>
            </dl>
          </div>

          {/* Reminder effectiveness (org-level only) */}
          {!campaignStats && (
            <div className="rounded-xl border bg-card p-5 shadow-md">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reminder Effectiveness</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total reminders sent</dt>
                  <dd className="font-medium">{stats.totalRemindersSent}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Opened after reminder</dt>
                  <dd className="font-medium text-green-600">{stats.openedAfterReminder}</dd>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <dt className="text-muted-foreground">Effectiveness rate</dt>
                  <dd className="font-semibold text-amber-600">{stats.reminderEffectiveness}%</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">% of messages opened after a reminder was sent</p>
            </div>
          )}

          {/* User activity (provider view) */}
          {viewLevel === "provider" && !campaignStats && (
            <div className="rounded-xl border bg-card p-5 shadow-md">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User Activity</h2>
              {stats.senderBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No send activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.senderBreakdown.map((sender, i) => (
                    <div key={sender.name} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{sender.name}</span>
                      <Badge variant="outline" className="text-xs">{sender.count} send{sender.count !== 1 ? "s" : ""}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Campaigns quick list */}
          {!campaignStats && campaigns.length > 0 && (
            <div className="rounded-xl border bg-card p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Campaigns</h2>
                <Link href="/campaigns" className="text-xs font-medium text-primary hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((c) => (
                  <Link
                    key={c.id}
                    href={`/campaigns/${c.id}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/30"
                  >
                    <span className="font-medium">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{c.totalRecipients} recipients</span>
                      <Badge variant="outline" className="text-xs">{c.openRate}% open</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Top content */}
          {!campaignStats && (
            <div className="rounded-xl border bg-card p-5 shadow-md md:col-span-2">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Most Frequently Sent Content</h2>
              {stats.topContent.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <BarChart3 className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">{data === null ? "Loading..." : "No messages sent yet"}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground/70">Content popularity will appear here after you start sending</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.topContent.map((item, i) => (
                    <div key={item.title} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-xs">{item.count} send{item.count !== 1 ? "s" : ""}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent activity */}
          {!campaignStats && (
            <div className="rounded-xl border bg-card p-5 shadow-md md:col-span-2">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h2>
              {stats.recentMessages.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Send className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">No messages sent yet</p>
                    <p className="mt-0.5 text-sm text-muted-foreground/70">Recent activity will show up here once you start sending</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {stats.recentMessages.slice(0, 8).map((msg) => (
                    <div key={msg.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={msg.deliveryChannel === "email" ? "border-primary/20 bg-primary/5 text-primary" : "border-green-200 bg-green-50 text-green-700"}>
                          {msg.deliveryChannel === "email" ? "Email" : "SMS"}
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">{msg.recipientContact}</span>
                        {viewLevel === "provider" && msg.senderName && (
                          <span className="text-xs text-muted-foreground">by {msg.senderName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{new Date(msg.sentAt).toLocaleDateString()}</span>
                        <StatusIndicator status={msg.status} opened={!!msg.openedAt} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function MetricCard({ label, value, icon, color, loading }: {
  label: string; value: string | number; icon: React.ReactNode; color?: string; loading?: boolean;
}) {
  const colorClass = color === "green" ? "text-green-600" : color === "teal" ? "text-primary" : color === "blue" ? "text-blue-600" : color === "purple" ? "text-violet-600" : color === "amber" ? "text-amber-600" : "text-foreground";
  const iconColor = color === "green" ? "text-green-500 bg-green-50" : color === "teal" ? "text-primary bg-primary/10" : color === "blue" ? "text-blue-500 bg-blue-50" : color === "purple" ? "text-violet-500 bg-violet-50" : color === "amber" ? "text-amber-500 bg-amber-50" : "text-muted-foreground bg-muted";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-md card-hover hover:shadow-lg hover:border-primary/20">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconColor}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="h-7 w-14 animate-pulse rounded bg-muted" />
      ) : (
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      )}
    </div>
  );
}

function ChannelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${color} animate-bar-fill`} style={{ "--bar-width": `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}

function StatusIndicator({ status, opened }: { status: string; opened: boolean }) {
  if (opened) return <span className="flex items-center gap-1.5 text-xs font-medium text-green-600"><Eye className="h-3 w-3" />Opened</span>;
  if (status === "failed") return <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><CircleX className="h-3 w-3" />Failed</span>;
  if (status === "delivered") return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><CircleCheck className="h-3 w-3" />Not opened</span>;
  return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}
