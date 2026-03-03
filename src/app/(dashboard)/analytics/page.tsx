"use client";

import { useEffect, useState } from "react";
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
import { toast } from "sonner";

type DateRange = "7d" | "30d" | "90d" | "all";
type ViewLevel = "org" | "provider";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("all");
  const [viewLevel, setViewLevel] = useState<ViewLevel>("org");
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    getAnalytics(range)
      .then(setData)
      .catch(() => {});
  }, [range]);

  const stats = data ?? {
    totalSent: 0,
    totalDelivered: 0,
    totalOpened: 0,
    totalFailed: 0,
    openRate: 0,
    itemEngagementRate: 0,
    reminderEffectiveness: 0,
    totalRemindersSent: 0,
    openedAfterReminder: 0,
    emailCount: 0,
    smsCount: 0,
    qrCount: 0,
    uniqueRecipients: 0,
    topContent: [],
    recentMessages: [],
    senderBreakdown: [],
  };

  const handleExportCSV = () => {
    const headers = ["Recipient", "Channel", "Status", "Sent At", "Opened At", "Sender"];
    const rows = stats.recentMessages.map((msg) => [
      msg.recipientContact,
      msg.deliveryChannel,
      msg.status,
      msg.sentAt,
      msg.openedAt ?? "",
      msg.senderName ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peg-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <>
      <Header title="Analytics" />
      <main className="flex-1 overflow-auto p-6">
        {/* Controls bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* View level toggle */}
            <div className="flex rounded-lg border bg-gray-50 p-0.5">
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewLevel === "org" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewLevel("org")}
              >
                Org-Level
              </button>
              <button
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${viewLevel === "provider" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setViewLevel("provider")}
              >
                By Provider
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {range === "7d" ? "last 7 days" : range === "30d" ? "last 30 days" : range === "90d" ? "last 90 days" : "all time"}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-1.5">
                <path d="M4 12h8M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
          <MetricCard label="Messages Sent" value={stats.totalSent} />
          <MetricCard label="Delivered" value={stats.totalDelivered} color="green" />
          <MetricCard label="Opened" value={stats.totalOpened} color="teal" />
          <MetricCard label="Open Rate" value={`${stats.openRate}%`} color="blue" />
          <MetricCard label="Item Engagement" value={`${stats.itemEngagementRate}%`} color="purple" />
          <MetricCard label="Reminder Effect." value={`${stats.reminderEffectiveness}%`} color="amber" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Channel breakdown */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">By Channel</h2>
            <div className="space-y-3">
              <ChannelBar label="Email" count={stats.emailCount} total={stats.totalSent} color="#7c3aed" />
              <ChannelBar label="SMS" count={stats.smsCount} total={stats.totalSent} color="#059669" />
              {stats.qrCount > 0 && <ChannelBar label="QR Code" count={stats.qrCount} total={stats.totalSent} color="#d97706" />}
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unique recipients</dt>
                <dd className="font-medium">{stats.uniqueRecipients}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivered</dt>
                <dd className="font-medium text-green-600">{stats.totalDelivered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Failed</dt>
                <dd className="font-medium text-red-600">{stats.totalFailed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Awaiting open</dt>
                <dd className="font-medium text-yellow-600">{stats.totalDelivered - stats.totalOpened}</dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="text-muted-foreground">Open rate</dt>
                <dd className="font-semibold text-teal-700">{stats.openRate}%</dd>
              </div>
            </dl>
          </div>

          {/* Reminder effectiveness */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reminder Effectiveness</h2>
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

          {/* User activity (provider view) */}
          {viewLevel === "provider" && (
            <div className="rounded-lg border bg-white p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">User Activity</h2>
              {stats.senderBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No send activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.senderBreakdown.map((sender, i) => (
                    <div key={sender.name} className="flex items-center gap-3 rounded-md border px-3 py-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">{i + 1}</span>
                      <span className="flex-1 text-sm font-medium">{sender.name}</span>
                      <Badge variant="outline" className="text-xs">{sender.count} send{sender.count !== 1 ? "s" : ""}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Top content */}
          <div className="rounded-lg border bg-white p-5 md:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Most Frequently Sent Content</h2>
            {stats.topContent.length === 0 ? (
              <p className="text-sm text-muted-foreground">{data === null ? "Loading..." : "No messages sent yet."}</p>
            ) : (
              <div className="space-y-2">
                {stats.topContent.map((item, i) => (
                  <div key={item.title} className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-700">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                    <Badge variant="outline" className="text-xs">{item.count} send{item.count !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border bg-white p-5 md:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</h2>
            <div className="space-y-2">
              {stats.recentMessages.slice(0, 8).map((msg) => (
                <div key={msg.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={msg.deliveryChannel === "email" ? "border-teal-200 bg-teal-50 text-teal-700" : "border-green-200 bg-green-50 text-green-700"}>
                      {msg.deliveryChannel === "email" ? "Email" : "SMS"}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">{msg.recipientContact}</span>
                    {viewLevel === "provider" && msg.senderName && (
                      <span className="text-xs text-muted-foreground">by {msg.senderName}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{new Date(msg.sentAt).toLocaleDateString()}</span>
                    <StatusDot status={msg.status} opened={!!msg.openedAt} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClass =
    color === "green" ? "text-green-600"
      : color === "teal" ? "text-teal-700"
        : color === "blue" ? "text-blue-600"
          : color === "purple" ? "text-purple-600"
            : color === "amber" ? "text-amber-600"
              : "text-foreground";
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChannelBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatusDot({ status, opened }: { status: string; opened: boolean }) {
  if (opened) return <span className="flex items-center gap-1 text-xs text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" />Opened</span>;
  if (status === "failed") return <span className="flex items-center gap-1 text-xs text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" />Failed</span>;
  if (status === "delivered") return <span className="flex items-center gap-1 text-xs text-yellow-600"><span className="h-2 w-2 rounded-full bg-yellow-500" />Not opened</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-500"><span className="h-2 w-2 rounded-full bg-gray-500" />{status}</span>;
}
