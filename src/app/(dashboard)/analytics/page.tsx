"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAnalytics, type AnalyticsData } from "@/lib/actions/analytics";

type DateRange = "7d" | "30d" | "90d" | "all";

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>("all");
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
    emailCount: 0,
    smsCount: 0,
    qrCount: 0,
    uniqueRecipients: 0,
    topContent: [],
    recentMessages: [],
  };

  return (
    <>
      <Header title="Analytics" />
      <main className="flex-1 overflow-auto p-6">
        {/* Date range filter */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing data for{" "}
            <span className="font-medium text-foreground">
              {range === "7d"
                ? "last 7 days"
                : range === "30d"
                  ? "last 30 days"
                  : range === "90d"
                    ? "last 90 days"
                    : "all time"}
            </span>
          </p>
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

        {/* Key metrics */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="Messages Sent" value={stats.totalSent} />
          <MetricCard label="Delivered" value={stats.totalDelivered} color="green" />
          <MetricCard label="Opened" value={stats.totalOpened} color="purple" />
          <MetricCard label="Open Rate" value={`${stats.openRate}%`} color="blue" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Channel breakdown */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              By Channel
            </h2>
            <div className="space-y-3">
              <ChannelBar label="Email" count={stats.emailCount} total={stats.totalSent} color="#7c3aed" />
              <ChannelBar label="SMS" count={stats.smsCount} total={stats.totalSent} color="#059669" />
              {stats.qrCount > 0 && (
                <ChannelBar label="QR Code" count={stats.qrCount} total={stats.totalSent} color="#d97706" />
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-lg border bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Summary
            </h2>
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
                <dd className="font-medium text-yellow-600">
                  {stats.totalDelivered - stats.totalOpened}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-3">
                <dt className="text-muted-foreground">Open rate</dt>
                <dd className="font-semibold text-purple-700">{stats.openRate}%</dd>
              </div>
            </dl>
          </div>

          {/* Top content */}
          <div className="rounded-lg border bg-white p-5 md:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Most Frequently Sent Content
            </h2>
            {stats.topContent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data === null ? "Loading..." : "No messages sent yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {stats.topContent.map((item, i) => (
                  <div key={item.title} className="flex items-center gap-3 rounded-md border px-3 py-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{item.title}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.count} send{item.count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border bg-white p-5 md:col-span-2">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Activity
            </h2>
            <div className="space-y-2">
              {stats.recentMessages.slice(0, 8).map((msg) => (
                <div key={msg.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        msg.deliveryChannel === "email"
                          ? "border-purple-200 bg-purple-50 text-purple-700"
                          : "border-green-200 bg-green-50 text-green-700"
                      }
                    >
                      {msg.deliveryChannel === "email" ? "Email" : "SMS"}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {msg.recipientContact}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.sentAt).toLocaleDateString()}
                    </span>
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
    color === "green" ? "text-green-600" : color === "purple" ? "text-purple-700" : color === "blue" ? "text-blue-600" : "text-foreground";
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
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
  if (opened) return <span className="flex items-center gap-1 text-xs text-green-600"><span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />Opened</span>;
  if (status === "failed") return <span className="flex items-center gap-1 text-xs text-red-600"><span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />Failed</span>;
  if (status === "delivered") return <span className="flex items-center gap-1 text-xs text-yellow-600"><span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />Not opened</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-500"><span className="h-2 w-2 rounded-full bg-gray-500" aria-hidden="true" />{status}</span>;
}
