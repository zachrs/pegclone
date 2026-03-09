"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCampaignTemplates,
  type CampaignTemplateSummary,
} from "@/lib/actions/campaign-templates";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Timer,
  Users,
  ChevronRight,
  Plus,
  CalendarClock,
  Layers,
} from "lucide-react";

export default function CampaignTemplatesPage() {
  const [templates, setTemplates] = useState<CampaignTemplateSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getCampaignTemplates()
      .then((data) => {
        setTemplates(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return (
    <>
      <Header title="Campaign Templates" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl animate-fade-in-up">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                Time-Release Campaign Templates
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Create reusable multi-step campaigns that send content at
                scheduled intervals.
              </p>
            </div>
            <Button asChild>
              <Link href="/campaigns/templates/new" className="gap-2">
                <Plus className="h-4 w-4" />
                New Template
              </Link>
            </Button>
          </div>

          {/* Quick links */}
          <div className="mb-4">
            <Link
              href="/campaigns"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              &larr; Back to Bulk Send Campaigns
            </Link>
          </div>

          {!loaded ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-md">
              <div className="flex items-center gap-6 border-b bg-muted/30 px-4 py-3">
                <div className="h-3 w-32 rounded bg-muted" />
                <div className="h-3 w-16 rounded bg-muted" />
                <div className="ml-auto h-3 w-20 rounded bg-muted" />
                <div className="h-3 w-20 rounded bg-muted" />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-6 border-b px-4 py-3.5 last:border-b-0"
                >
                  <div
                    className="h-4 w-40 animate-pulse rounded bg-muted"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                  <div
                    className="h-4 w-10 animate-pulse rounded bg-muted"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                  <div
                    className="ml-auto h-4 w-16 animate-pulse rounded bg-muted"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                  <div
                    className="h-4 w-12 animate-pulse rounded bg-muted"
                    style={{ animationDelay: `${i * 0.05}s` }}
                  />
                </div>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <CalendarClock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  No campaign templates yet
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a time-release template to schedule multi-step
                  education campaigns.
                </p>
              </div>
              <Button asChild>
                <Link href="/campaigns/templates/new" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Template
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-md">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Template Name</TableHead>
                    <TableHead className="w-24 text-right">Steps</TableHead>
                    <TableHead className="w-32 text-right">Duration</TableHead>
                    <TableHead className="w-28 text-right">Enrolled</TableHead>
                    <TableHead className="w-28">Created</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((t) => (
                    <TableRow
                      key={t.id}
                      className="group transition-colors hover:bg-muted/40"
                    >
                      <TableCell>
                        <Link
                          href={`/campaigns/templates/${t.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {t.name}
                        </Link>
                        {t.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {t.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1.5 text-sm">
                          <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.stepCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1.5 text-sm">
                          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDuration(t.totalDurationDays)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="flex items-center justify-end gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {t.enrolledCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/campaigns/templates/${t.id}`}
                          className="text-muted-foreground transition-colors group-hover:text-foreground"
                        >
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
      </main>
    </>
  );
}

function formatDuration(days: number): string {
  if (days === 0) return "Immediate";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}
