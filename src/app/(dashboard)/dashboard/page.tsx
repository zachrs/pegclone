"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { useSendCart } from "@/lib/hooks/use-send-cart";
import { getAnalytics, type AnalyticsData } from "@/lib/actions/analytics";
import {
  BookOpen,
  Send,
  BarChart3,
  CircleCheck,
  CircleX,
  Eye,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

export default function DashboardPage() {
  const { items: cartItems } = useSendCart();
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    getAnalytics("all")
      .then(setData)
      .catch(() => {});
  }, []);

  const totalSent = data?.totalSent ?? 0;
  const delivered = data?.totalDelivered ?? 0;
  const failed = data?.totalFailed ?? 0;
  const openRate = data?.openRate ?? 0;
  const recentMessages = data?.recentMessages ?? [];

  return (
    <>
      <Header title="Dashboard" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl animate-fade-in-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight">
              Welcome to Patient Education Genius
            </h2>
            <p className="mt-1 text-muted-foreground">
              Send patient education materials via email, SMS, or QR code.
            </p>
          </div>

          {/* Quick stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Messages Sent" value={totalSent} icon={<Send className="h-4 w-4" />} loading={!data} />
            <StatCard label="Delivered" value={delivered} icon={<CircleCheck className="h-4 w-4" />} color="green" loading={!data} />
            <StatCard label="Open Rate" value={`${openRate}%`} icon={<TrendingUp className="h-4 w-4" />} color="teal" loading={!data} />
            <StatCard label="Failed" value={failed} icon={<CircleX className="h-4 w-4" />} color={failed > 0 ? "red" : undefined} loading={!data} />
          </div>

          {/* Quick actions */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <QuickAction
              href="/library"
              title="Browse Library"
              description="Search 40,000+ patient education items or your org uploads"
              icon={<BookOpen className="h-5 w-5" />}
            />
            <QuickAction
              href="/send"
              title="Send Content"
              description={
                cartItems.length > 0
                  ? `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} in your cart — ready to send`
                  : "Select items from the library first"
              }
              icon={<Send className="h-5 w-5" />}
              badge={cartItems.length > 0 ? `${cartItems.length}` : undefined}
            />
            <QuickAction
              href="/analytics"
              title="View Analytics"
              description="Track delivery rates, opens, and engagement trends"
              icon={<BarChart3 className="h-5 w-5" />}
            />
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border bg-card p-5 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent Messages
              </h2>
              <Link href="/tracking" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {data === null ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-12 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-14 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentMessages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Send className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No messages sent yet</p>
                  <p className="mt-0.5 text-sm text-muted-foreground/70">Start by browsing the Library and selecting content to send</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentMessages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          msg.deliveryChannel === "email"
                            ? "border-primary/20 bg-primary/5 text-primary"
                            : msg.deliveryChannel === "qr_code"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-green-200 bg-green-50 text-green-700"
                        }
                      >
                        {msg.deliveryChannel === "email" ? "Email" : msg.deliveryChannel === "qr_code" ? "QR" : "SMS"}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">{msg.recipientContact}</span>
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

          {failed > 0 && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-700">
                  {failed} message{failed !== 1 ? "s" : ""} failed to deliver
                </p>
                <p className="mt-0.5 text-xs text-red-600">
                  Check the Recipients page for details on failed deliveries.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, icon, color, loading }: {
  label: string; value: string | number; icon: React.ReactNode; color?: string; loading?: boolean;
}) {
  const colorClass = color === "green" ? "text-green-600" : color === "teal" ? "text-primary" : color === "red" ? "text-red-600" : "text-foreground";
  const iconColor = color === "green" ? "text-green-500 bg-green-50" : color === "teal" ? "text-primary bg-primary/10" : color === "red" ? "text-red-500 bg-red-50" : "text-muted-foreground bg-muted";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-md card-hover hover:shadow-lg hover:border-primary/20">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconColor}`}>{icon}</div>
      </div>
      {loading ? (
        <div className="h-8 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      )}
    </div>
  );
}

function QuickAction({ href, title, description, icon, badge }: {
  href: string; title: string; description: string; icon: React.ReactNode; badge?: string;
}) {
  return (
    <Link href={href} className="group flex gap-4 rounded-xl border bg-card p-5 shadow-md card-hover hover:shadow-lg hover:border-primary/20">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function StatusIndicator({ status, opened }: { status: string; opened: boolean }) {
  if (opened) return <span className="flex items-center gap-1.5 text-xs font-medium text-green-600"><Eye className="h-3 w-3" />Opened</span>;
  if (status === "failed") return <span className="flex items-center gap-1.5 text-xs font-medium text-red-600"><CircleX className="h-3 w-3" />Failed</span>;
  if (status === "delivered") return <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600"><CircleCheck className="h-3 w-3" />Not opened</span>;
  return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}
