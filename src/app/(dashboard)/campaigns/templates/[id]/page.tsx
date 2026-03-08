"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCampaignTemplate,
  getEnrollmentsForTemplate,
  getEnrollmentDetail,
  enrollRecipients,
  pauseEnrollment,
  resumeEnrollment,
  cancelEnrollment,
  updateCampaignTemplate,
  deleteCampaignTemplate,
  duplicateCampaignTemplate,
  type CampaignTemplateDetail,
  type EnrollmentSummary,
  type EnrollmentDetail,
} from "@/lib/actions/campaign-templates";
import { searchRecipients } from "@/lib/actions/recipients";
import { TemplateEditor } from "@/components/campaigns/template-editor";
import {
  UserPlus,
  Users,
  Layers,
  Timer,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Search,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Eye,
  Mail,
  MessageSquare,
} from "lucide-react";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<CampaignTemplateDetail | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<EnrollmentDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [tmpl, enrl] = await Promise.all([
        getCampaignTemplate(templateId),
        getEnrollmentsForTemplate(templateId),
      ]);
      setTemplate(tmpl);
      setEnrollments(enrl);
    } catch {
      // ignore
    } finally {
      setLoaded(true);
    }
  }, [templateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!loaded) {
    return (
      <>
        <Header title="Campaign Template" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl">
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="mt-4 h-64 animate-pulse rounded-xl bg-muted" />
          </div>
        </main>
      </>
    );
  }

  if (!template) {
    return (
      <>
        <Header title="Template Not Found" />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-4xl text-center py-16">
            <p className="text-muted-foreground">Template not found.</p>
            <Button variant="outline" asChild className="mt-4">
              <Link href="/campaigns/templates">Back to Templates</Link>
            </Button>
          </div>
        </main>
      </>
    );
  }

  if (editMode) {
    return (
      <>
        <Header title={`Edit: ${template.name}`} />
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl animate-fade-in-up">
            <button
              onClick={() => setEditMode(false)}
              className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Cancel editing
            </button>
            <TemplateEditor
              initialName={template.name}
              initialDescription={template.description ?? ""}
              initialSteps={template.steps}
              saveLabel="Update Template"
              onSave={async (data) => {
                await updateCampaignTemplate(templateId, {
                  name: data.name,
                  description: data.description || undefined,
                  steps: data.steps,
                });
                setEditMode(false);
                loadData();
              }}
            />
          </div>
        </main>
      </>
    );
  }

  const activeCount = enrollments.filter((e) => e.status === "active").length;
  const completedCount = enrollments.filter((e) => e.status === "completed").length;
  const pausedCount = enrollments.filter((e) => e.status === "paused").length;
  const maxDelay =
    template.steps.length > 0
      ? Math.max(...template.steps.map((s) => s.delayDays))
      : 0;

  return (
    <>
      <Header title={template.name} />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-5xl animate-fade-in-up">
          {/* Breadcrumb */}
          <div className="mb-4">
            <Link
              href="/campaigns/templates"
              className="text-sm text-muted-foreground hover:text-primary"
            >
              &larr; Back to Templates
            </Link>
          </div>

          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {template.name}
              </h2>
              {template.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setEnrollDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Enroll Recipients
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditMode(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const { id } = await duplicateCampaignTemplate(templateId);
                      router.push(`/campaigns/templates/${id}`);
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={async () => {
                      await deleteCampaignTemplate(templateId);
                      router.push("/campaigns/templates");
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Steps"
              value={template.steps.length}
              icon={<Layers className="h-4 w-4 text-primary" />}
            />
            <StatCard
              label="Duration"
              value={formatDuration(maxDelay)}
              icon={<Timer className="h-4 w-4 text-primary" />}
            />
            <StatCard
              label="Enrolled"
              value={enrollments.length}
              icon={<Users className="h-4 w-4 text-primary" />}
            />
            <StatCard
              label="Completed"
              value={completedCount}
              icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
            />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="enrollments">
                Enrollments ({enrollments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              {/* Steps timeline */}
              <div className="rounded-xl border bg-card p-6 shadow-md">
                <h3 className="mb-4 text-lg font-semibold">
                  Campaign Timeline
                </h3>
                <div className="space-y-3">
                  {template.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-lg border bg-background p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {step.stepNumber}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{step.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Day {step.delayDays}
                          {step.delayDays === 0
                            ? " (immediately on enrollment)"
                            : ` after enrollment`}
                          {" · "}
                          {step.contentItemIds.length} content item
                          {step.contentItemIds.length !== 1 ? "s" : ""}
                          {step.reminderEnabled &&
                            ` · ${step.maxReminders} reminder${step.maxReminders !== 1 ? "s" : ""} every ${step.reminderIntervalHours}h`}
                        </p>
                      </div>
                      {i < template.steps.length - 1 && (
                        <div className="text-xs text-muted-foreground">
                          {template.steps[i + 1]!.delayDays - step.delayDays}d
                          until next
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="enrollments" className="mt-4">
              {selectedEnrollment ? (
                <EnrollmentDetailView
                  enrollment={selectedEnrollment}
                  onBack={() => setSelectedEnrollment(null)}
                />
              ) : (
                <EnrollmentTable
                  enrollments={enrollments}
                  totalSteps={template.steps.length}
                  onViewDetail={async (enrollmentId) => {
                    const detail = await getEnrollmentDetail(enrollmentId);
                    if (detail) setSelectedEnrollment(detail);
                  }}
                  onPause={async (enrollmentId) => {
                    await pauseEnrollment(enrollmentId);
                    loadData();
                  }}
                  onResume={async (enrollmentId) => {
                    await resumeEnrollment(enrollmentId);
                    loadData();
                  }}
                  onCancel={async (enrollmentId) => {
                    await cancelEnrollment(enrollmentId);
                    loadData();
                  }}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Enroll Dialog */}
          <EnrollDialog
            open={enrollDialogOpen}
            onOpenChange={setEnrollDialogOpen}
            templateId={templateId}
            onEnrolled={() => {
              setEnrollDialogOpen(false);
              loadData();
            }}
          />
        </div>
      </main>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function EnrollmentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-blue-200 bg-blue-50 text-blue-700",
    completed: "border-green-200 bg-green-50 text-green-700",
    paused: "border-yellow-200 bg-yellow-50 text-yellow-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
  };
  const icons: Record<string, React.ReactNode> = {
    active: <Play className="h-3 w-3" />,
    completed: <CheckCircle2 className="h-3 w-3" />,
    paused: <Pause className="h-3 w-3" />,
    cancelled: <XCircle className="h-3 w-3" />,
  };
  return (
    <Badge variant="outline" className={`gap-1 ${styles[status] ?? ""}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function ProgressBar({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground">
        {current}/{total}
      </span>
    </div>
  );
}

function EnrollmentTable({
  enrollments,
  totalSteps,
  onViewDetail,
  onPause,
  onResume,
  onCancel,
}: {
  enrollments: EnrollmentSummary[];
  totalSteps: number;
  onViewDetail: (id: string) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Users className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No recipients enrolled yet. Click &quot;Enroll Recipients&quot; to
          get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Recipient</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-32">Progress</TableHead>
            <TableHead className="w-28">Enrolled</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.map((e) => (
            <TableRow
              key={e.id}
              className="group transition-colors hover:bg-muted/40"
            >
              <TableCell>
                <div>
                  <p className="font-medium">{e.recipientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.recipientContact}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <EnrollmentStatusBadge status={e.status} />
              </TableCell>
              <TableCell>
                <ProgressBar current={e.currentStep} total={totalSteps} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(e.enrolledAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewDetail(e.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {e.status === "active" && (
                        <DropdownMenuItem onClick={() => onPause(e.id)}>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </DropdownMenuItem>
                      )}
                      {e.status === "paused" && (
                        <DropdownMenuItem onClick={() => onResume(e.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </DropdownMenuItem>
                      )}
                      {(e.status === "active" || e.status === "paused") && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onCancel(e.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Cancel
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EnrollmentDetailView({
  enrollment,
  onBack,
}: {
  enrollment: EnrollmentDetail;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to enrollments
      </button>

      <div className="rounded-xl border bg-card p-6 shadow-md">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">
              {enrollment.recipientName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {enrollment.recipientContact} · Enrolled{" "}
              {new Date(enrollment.enrolledAt).toLocaleDateString()}
            </p>
          </div>
          <EnrollmentStatusBadge status={enrollment.status} />
        </div>

        <h4 className="mb-3 font-medium">Step Delivery Timeline</h4>
        <div className="space-y-3">
          {enrollment.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="flex items-center gap-4 rounded-lg border p-3"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  step.sentAt
                    ? "bg-green-100 text-green-700"
                    : step.stepNumber <= enrollment.currentStep
                      ? "bg-blue-100 text-blue-700"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step.sentAt ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  step.stepNumber
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{step.stepName}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {step.sentAt ? (
                    <>
                      <span>
                        Sent {new Date(step.sentAt).toLocaleDateString()}
                      </span>
                      {step.messageStatus && (
                        <Badge variant="outline" className="text-[10px]">
                          {step.messageStatus}
                        </Badge>
                      )}
                      {step.openedAt && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Eye className="h-3 w-3" />
                          Opened{" "}
                          {new Date(step.openedAt).toLocaleDateString()}
                        </span>
                      )}
                    </>
                  ) : step.scheduledFor ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Scheduled for{" "}
                      {new Date(step.scheduledFor).toLocaleDateString()}
                    </span>
                  ) : (
                    <span>Pending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Enroll Dialog ──────────────────────────────────────────────────────────

function EnrollDialog({
  open,
  onOpenChange,
  templateId,
  onEnrolled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  onEnrolled: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; firstName: string; lastName: string; contact: string }>
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ id: string; name: string; contact: string }>
  >([]);
  const [enrolling, setEnrolling] = useState(false);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<{
    enrolled: number;
    skipped: number;
  } | null>(null);

  async function handleSearch() {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const results = await searchRecipients(searchTerm);
      setSearchResults(
        results.map((r: { id: string; firstName: string; lastName: string; contact: string }) => ({
          id: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          contact: r.contact,
        }))
      );
    } catch {
      // ignore
    } finally {
      setSearching(false);
    }
  }

  function toggleRecipient(r: {
    id: string;
    firstName: string;
    lastName: string;
    contact: string;
  }) {
    const newSet = new Set(selectedIds);
    if (newSet.has(r.id)) {
      newSet.delete(r.id);
      setSelectedRecipients(selectedRecipients.filter((s) => s.id !== r.id));
    } else {
      newSet.add(r.id);
      setSelectedRecipients([
        ...selectedRecipients,
        {
          id: r.id,
          name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.contact,
          contact: r.contact,
        },
      ]);
    }
    setSelectedIds(newSet);
  }

  async function handleEnroll() {
    if (selectedIds.size === 0) return;
    setEnrolling(true);
    try {
      const res = await enrollRecipients({
        templateId,
        recipientIds: Array.from(selectedIds),
      });
      setResult(res);
      setTimeout(() => {
        setResult(null);
        setSelectedIds(new Set());
        setSelectedRecipients([]);
        setSearchResults([]);
        setSearchTerm("");
        onEnrolled();
      }, 2000);
    } catch {
      // ignore
    } finally {
      setEnrolling(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enroll Recipients</DialogTitle>
          <DialogDescription>
            Search your roster and select recipients to enroll in this
            campaign.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium">
              {result.enrolled} recipient
              {result.enrolled !== 1 ? "s" : ""} enrolled
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-muted-foreground">
                {result.skipped} already enrolled (skipped)
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    className={`flex w-full items-center gap-3 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/50 ${
                      selectedIds.has(r.id) ? "bg-primary/5" : ""
                    }`}
                    onClick={() => toggleRecipient(r)}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded border ${
                        selectedIds.has(r.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {selectedIds.has(r.id) && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {[r.firstName, r.lastName].filter(Boolean).join(" ") ||
                          "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.contact}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected */}
            {selectedRecipients.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">
                  Selected ({selectedRecipients.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecipients.map((r) => (
                    <Badge
                      key={r.id}
                      variant="secondary"
                      className="gap-1 cursor-pointer"
                      onClick={() =>
                        toggleRecipient({
                          id: r.id,
                          firstName: r.name,
                          lastName: "",
                          contact: r.contact,
                        })
                      }
                    >
                      {r.name}
                      <XCircle className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleEnroll}
                disabled={selectedIds.size === 0 || enrolling}
                className="gap-2"
              >
                {enrolling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Enroll {selectedIds.size} recipient
                {selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function formatDuration(days: number): string {
  if (days === 0) return "Immediate";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${(days / 365).toFixed(1)}yr`;
}
