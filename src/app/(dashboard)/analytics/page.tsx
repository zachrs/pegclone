"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMessagesStore, type Message } from "@/lib/hooks/use-messages-store";

type DateRange = "7d" | "30d" | "90d" | "all";

function filterByRange(messages: Message[], range: DateRange): Message[] {
  if (range === "all") return messages;
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return messages.filter((m) => new Date(m.sentAt) >= cutoff);
}

export default function AnalyticsPage() {
  const { messages } = useMessagesStore();
  const [range, setRange] = useState<DateRange>("all");

  const filtered = useMemo(() => filterByRange(messages, range), [messages, range]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const delivered = filtered.filter((m) => m.status === "delivered").length;
    const failed = filtered.filter((m) => m.status === "failed").length;
    const opened = filtered.filter((m) => m.openedAt !== null).length;
    const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;

    // Channel breakdown
    const byChannel = { email: 0, sms: 0, qr_code: 0 };
    for (const m of filtered) {
      byChannel[m.deliveryChannel] = (byChannel[m.deliveryChannel] || 0) + 1;
    }

    // Most sent content
    const contentCounts = new Map<string, number>();
    for (const m of filtered) {
      for (const block of m.contentBlocks) {
        contentCounts.set(block.title, (contentCounts.get(block.title) || 0) + 1);
      }
    }
    const topContent = Array.from(contentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Unique recipients
    const uniqueRecipients = new Set(filtered.map((m) => m.recipientContact)).size;

    return { total, delivered, failed, opened, openRate, byChannel, topContent, uniqueRecipients };
  }, [filtered]);

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
          <MetricCard label="Messages Sent" value={stats.total} />
          <MetricCard label="Delivered" value={stats.delivered} color="green" />
          <MetricCard label="Opened" value={stats.opened} color="purple" />
          <MetricCard label="Open Rate" value={`${stats.openRate}%`} color="blue" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Channel breakdown */}
          <div className="rounded-lg border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              By Channel
            </h3>
            <div className="space-y-3">
              <ChannelBar
                label="Email"
                count={stats.byChannel.email}
                total={stats.total}
                color="#7c3aed"
              />
              <ChannelBar
                label="SMS"
                count={stats.byChannel.sms}
                total={stats.total}
                color="#059669"
              />
              {stats.byChannel.qr_code > 0 && (
                <ChannelBar
                  label="QR Code"
                  count={stats.byChannel.qr_code}
                  total={stats.total}
                  color="#d97706"
                />
              )}
            </div>
          </div>

          {/* Summary stats */}
          <div className="rounded-lg border bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unique recipients</dt>
                <dd className="font-medium">{stats.uniqueRecipients}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivered</dt>
                <dd className="font-medium text-green-600">{stats.delivered}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Failed</dt>
                <dd className="font-medium text-red-600">{stats.failed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Awaiting open</dt>
                <dd className="font-medium text-yellow-600">
                  {stats.delivered - stats.opened}
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
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Most Frequently Sent Content
            </h3>
            {stats.topContent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages sent yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.topContent.map(([title, count], i) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 rounded-md border px-3 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium">{title}</span>
                    <Badge variant="outline" className="text-xs">
                      {count} send{count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border bg-white p-5 md:col-span-2">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Activity
            </h3>
            <div className="space-y-2">
              {filtered.slice(0, 8).map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
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

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "purple"
        ? "text-purple-700"
        : color === "blue"
          ? "text-blue-600"
          : "text-foreground";

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ChannelBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatusDot({ status, opened }: { status: string; opened: boolean }) {
  if (opened) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Opened
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Failed
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-600">
        <span className="h-2 w-2 rounded-full bg-yellow-500" />
        Not opened
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      {status}
    </span>
  );
}
