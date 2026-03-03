"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { useSendCart } from "@/lib/hooks/use-send-cart";
import { getAnalytics, type AnalyticsData } from "@/lib/actions/analytics";

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
        <div className="mx-auto max-w-4xl">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold">
              Welcome to Patient Education Genius
            </h2>
            <p className="mt-1 text-muted-foreground">
              Send patient education materials via email, SMS, or QR code.
            </p>
          </div>

          {/* Quick stats */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard label="Messages Sent" value={totalSent} />
            <StatCard label="Delivered" value={delivered} color="green" />
            <StatCard label="Open Rate" value={`${openRate}%`} color="purple" />
            <StatCard label="Failed" value={failed} color={failed > 0 ? "red" : undefined} />
          </div>

          {/* Quick actions */}
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <QuickAction
              href="/library"
              title="Browse Library"
              description="Search 40,000+ patient education items or your org uploads"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                </svg>
              }
            />
            <QuickAction
              href="/send"
              title="Send Content"
              description={
                cartItems.length > 0
                  ? `${cartItems.length} item${cartItems.length !== 1 ? "s" : ""} in your cart — ready to send`
                  : "Select items from the library first"
              }
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 2L11 13" />
                  <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              }
              badge={cartItems.length > 0 ? `${cartItems.length}` : undefined}
            />
            <QuickAction
              href="/analytics"
              title="View Analytics"
              description="Track delivery rates, opens, and engagement trends"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              }
            />
          </div>

          {/* Recent activity */}
          <div className="rounded-lg border bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent Messages
              </h2>
              <Link
                href="/recipients"
                className="text-sm text-purple-600 hover:underline"
              >
                View all
              </Link>
            </div>
            {recentMessages.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {data === null ? "Loading..." : "No messages sent yet. Start by browsing the Library!"}
              </p>
            ) : (
              <div className="space-y-2">
                {recentMessages.slice(0, 5).map((msg) => (
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
                            : msg.deliveryChannel === "qr_code"
                              ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                              : "border-green-200 bg-green-50 text-green-700"
                        }
                      >
                        {msg.deliveryChannel === "email"
                          ? "Email"
                          : msg.deliveryChannel === "qr_code"
                            ? "QR"
                            : "SMS"}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {msg.recipientContact}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {new Date(msg.sentAt).toLocaleDateString()}
                      </span>
                      <StatusDot
                        status={msg.status}
                        opened={!!msg.openedAt}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Failed messages alert */}
          {failed > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                <p className="text-sm font-medium text-red-700">
                  {failed} message{failed !== 1 ? "s" : ""} failed to deliver
                </p>
              </div>
              <p className="mt-1 text-xs text-red-600">
                Check the Recipients page for details on failed deliveries.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function StatCard({
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
          : color === "red"
            ? "text-red-600"
            : "text-foreground";

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function QuickAction({
  href,
  title,
  description,
  icon,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex gap-4 rounded-lg border bg-white p-5 transition-colors hover:border-purple-200 hover:bg-purple-50/30"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-200">
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{title}</h3>
          {badge && (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
              {badge}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

function StatusDot({
  status,
  opened,
}: {
  status: string;
  opened: boolean;
}) {
  if (opened) {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
        Opened
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex items-center gap-1 text-xs text-red-600">
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
        Failed
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="flex items-center gap-1 text-xs text-yellow-600">
        <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden="true" />
        Not opened
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <span className="h-2 w-2 rounded-full bg-gray-500" aria-hidden="true" />
      {status}
    </span>
  );
}
