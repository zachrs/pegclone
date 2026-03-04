"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCampaignDetail, type CampaignDetail } from "@/lib/actions/campaigns";
import {
  ArrowLeft,
  Users,
  CircleCheck,
  CircleX,
  Eye,
  Send,
  TrendingUp,
  Mail,
  MessageSquare,
  MailPlus,
  Download,
  Search,
} from "lucide-react";
import { toast } from "sonner";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!campaignId) return;
    getCampaignDetail(campaignId)
      .then((data) => { setCampaign(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [campaignId]);

  if (!loaded) {
    return (
      <>
        <Header title="Campaign" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="mt-2 h-7 w-12 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
          </div>
        </main>
      </>
    );
  }

  if (!campaign) {
    return (
      <>
        <Header title="Campaign" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-5xl py-16 text-center">
            <p className="text-muted-foreground">Campaign not found.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/campaigns">Back to Campaigns</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  const filteredRecipients = search
    ? campaign.recipientBreakdown.filter((r) =>
        r.contact.toLowerCase().includes(search.toLowerCase())
      )
    : campaign.recipientBreakdown;

  const handleExport = () => {
    const headers = ["Contact", "Type", "Channel", "Status", "Sent At", "Delivered At", "Opened At"];
    const rows = campaign.recipientBreakdown.map((r) => [
      r.contact,
      r.contactType,
      r.deliveryChannel,
      r.status,
      r.sentAt ?? "",
      r.deliveredAt ?? "",
      r.openedAt ?? "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${campaign.name.replace(/\s+/g, "-").toLowerCase()}-recipients.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const ChannelIcon = campaign.deliveryChannel === "email" ? Mail : campaign.deliveryChannel === "sms" ? MessageSquare : MailPlus;

  return (
    <>
      <Header title="Campaign Detail" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link href="/campaigns" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Campaigns
            </Link>
          </div>

          {/* Campaign header */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight">{campaign.name}</h2>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Created {new Date(campaign.createdAt).toLocaleDateString()}
                {campaign.sentAt && ` · Sent ${new Date(campaign.sentAt).toLocaleDateString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <ChannelIcon className="h-3 w-3" />
                {campaign.deliveryChannel === "sms_and_email" ? "SMS & Email" : campaign.deliveryChannel.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Stats cards */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard label="Total Sent" value={campaign.totalSent} icon={<Send className="h-4 w-4" />} />
            <StatCard label="Recipients" value={campaign.totalRecipients} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Delivered" value={`${campaign.delivered} (${campaign.deliveryRate}%)`} icon={<CircleCheck className="h-4 w-4" />} color="green" />
            <StatCard label="Opened" value={`${campaign.opened} (${campaign.openRate}%)`} icon={<Eye className="h-4 w-4" />} color="teal" />
            <StatCard label="Failed" value={campaign.failed} icon={<CircleX className="h-4 w-4" />} color={campaign.failed > 0 ? "red" : undefined} />
          </div>

          {/* Delivery rate visual */}
          <div className="mb-8 rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Funnel
            </h3>
            <div className="flex items-center gap-4">
              <FunnelBar label="Sent" count={campaign.totalSent} total={campaign.totalSent} color="bg-blue-500" />
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/30" />
              <FunnelBar label="Delivered" count={campaign.delivered} total={campaign.totalSent} color="bg-green-500" />
              <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground/30" />
              <FunnelBar label="Opened" count={campaign.opened} total={campaign.totalSent} color="bg-primary" />
            </div>
          </div>

          {/* Recipient breakdown */}
          <div className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
              <h3 className="text-sm font-semibold">
                Recipient Breakdown ({campaign.recipientBreakdown.length})
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search recipients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 w-48 pl-8 text-sm"
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Contact</TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead className="w-24">Channel</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-32">Sent</TableHead>
                  <TableHead className="w-32">Delivered</TableHead>
                  <TableHead className="w-32">Opened</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      {search ? "No recipients match your search." : "No recipients in this campaign."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecipients.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-sm">{r.contact}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.contactType === "email" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-green-200 bg-green-50 text-green-700"}>
                          {r.contactType === "email" ? "Email" : "SMS"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.deliveryChannel === "email" ? "Email" : r.deliveryChannel === "sms" ? "SMS" : r.deliveryChannel}
                      </TableCell>
                      <TableCell>
                        <RecipientStatusBadge status={r.status} opened={!!r.openedAt} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.deliveredAt ? new Date(r.deliveredAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.openedAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Eye className="h-3 w-3" />
                            {new Date(r.openedAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color?: string;
}) {
  const colorClass = color === "green" ? "text-green-600" : color === "teal" ? "text-primary" : color === "red" ? "text-red-600" : "text-foreground";
  const iconColor = color === "green" ? "text-green-500 bg-green-50" : color === "teal" ? "text-primary bg-primary/10" : color === "red" ? "text-red-500 bg-red-50" : "text-muted-foreground bg-muted";

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${iconColor}`}>{icon}</div>
      </div>
      <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function FunnelBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} ({pct}%)</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    sending: "border-blue-200 bg-blue-50 text-blue-700",
    completed: "border-green-200 bg-green-50 text-green-700",
    failed: "border-red-200 bg-red-50 text-red-700",
  };
  return <Badge variant="outline" className={styles[status] ?? ""}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}

function RecipientStatusBadge({ status, opened }: { status: string; opened: boolean }) {
  if (opened) return <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700"><Eye className="h-3 w-3" />Opened</Badge>;
  if (status === "failed") return <Badge variant="outline" className="gap-1 border-red-200 bg-red-50 text-red-700"><CircleX className="h-3 w-3" />Failed</Badge>;
  if (status === "delivered") return <Badge variant="outline" className="gap-1 border-amber-200 bg-amber-50 text-amber-700"><CircleCheck className="h-3 w-3" />Delivered</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
