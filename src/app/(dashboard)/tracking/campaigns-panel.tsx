"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCampaigns, type CampaignSummary } from "@/lib/actions/campaigns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Mail,
  MessageSquare,
  MailPlus,
  Users,
  CircleCheck,
  CircleX,
  Eye,
  ChevronRight,
  Megaphone,
} from "lucide-react";

export default function CampaignsPanel() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCampaigns()
      .then((data) => { setCampaigns(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-5xl animate-fade-in-up">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Bulk Send Campaigns</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              View past bulk sends, delivery rates, and open rates per campaign.
            </p>
          </div>
        </div>

        {!loaded ? (
          <div className="overflow-hidden rounded-xl border bg-card shadow-md">
            <div className="flex items-center gap-6 border-b bg-muted/30 px-4 py-3">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="ml-auto h-3 w-20 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
              <div className="h-3 w-16 rounded bg-muted" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0">
                <div className="h-4 w-36 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="h-5 w-14 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="h-4 w-12 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="h-5 w-14 animate-pulse rounded-full bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
                <div className="h-4 w-20 animate-pulse rounded bg-muted" style={{ animationDelay: `${i * 0.05}s` }} />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Megaphone className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No campaigns yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use the Send page to create a bulk send campaign, then track its performance here.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/send" className="gap-2">
                <Send className="h-4 w-4" />
                Create Campaign
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Campaign</TableHead>
                  <TableHead className="w-24">Channel</TableHead>
                  <TableHead className="w-28 text-right">Recipients</TableHead>
                  <TableHead className="w-28 text-right">Delivered</TableHead>
                  <TableHead className="w-24 text-right">Open Rate</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className="group transition-colors hover:bg-muted/40">
                    <TableCell>
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ChannelBadge channel={c.deliveryChannel} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1.5 text-sm">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.totalRecipients}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1.5 text-sm">
                          <CircleCheck className="h-3.5 w-3.5 text-green-500" />
                          {c.delivered}
                          {c.failed > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500">
                              <CircleX className="h-3 w-3" />
                              {c.failed}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{c.deliveryRate}% rate</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          {c.openRate}%
                        </span>
                        <span className="text-xs text-muted-foreground">{c.opened} opened</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.sentAt
                        ? new Date(c.sentAt).toLocaleDateString()
                        : new Date(c.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link href={`/campaigns/${c.id}`} className="text-muted-foreground transition-colors group-hover:text-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "email") return <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary"><Mail className="h-3 w-3" />Email</Badge>;
  if (channel === "sms") return <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700"><MessageSquare className="h-3 w-3" />SMS</Badge>;
  if (channel === "sms_and_email") return <Badge variant="outline" className="gap-1 border-violet-200 bg-violet-50 text-violet-700"><MailPlus className="h-3 w-3" />Both</Badge>;
  return <Badge variant="outline">{channel}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-yellow-200 bg-yellow-50 text-yellow-700",
    sending: "border-blue-200 bg-blue-50 text-blue-700",
    completed: "border-green-200 bg-green-50 text-green-700",
    failed: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
