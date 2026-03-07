"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { bulkInviteUsers } from "@/lib/actions/admin";
import type { UserRole } from "@/lib/db/types";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const TEMPLATE_HEADERS = ["full_name", "email", "role", "is_admin", "title"];
const TEMPLATE_EXAMPLE = [
  "Dr. Jane Smith,jane.smith@clinic.com,provider,no,OB/GYN",
  "John Doe,john.doe@clinic.com,org_user,no,Front Desk",
  "Sarah Admin,sarah@clinic.com,org_user,yes,Office Manager",
];
const VALID_ROLES = new Set(["org_user", "provider", "cs_rep"]);

interface ParsedRow {
  fullName: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  title: string;
  error?: string;
}

interface BulkInviteDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BulkInviteDialog({ open, onClose, onComplete }: BulkInviteDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    invited: number;
    skipped: Array<{ email: string; reason: string }>;
  } | null>(null);

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const downloadTemplate = () => {
    const csv = [TEMPLATE_HEADERS.join(","), ...TEMPLATE_EXAMPLE].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const headerLine = lines[0];
    if (!headerLine) return;
    const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

    // Map column indices
    const nameIdx = headers.findIndex((h) => h === "full_name" || h === "name" || h === "fullname");
    const emailIdx = headers.findIndex((h) => h === "email");
    const roleIdx = headers.findIndex((h) => h === "role");
    const adminIdx = headers.findIndex((h) => h === "is_admin" || h === "admin" || h === "isadmin");
    const titleIdx = headers.findIndex((h) => h === "title");

    if (nameIdx === -1 || emailIdx === -1) {
      toast.error("CSV must have 'full_name' and 'email' columns");
      return;
    }

    const parsed: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]?.trim();
      if (!line) continue;

      const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
      const fullName = cols[nameIdx] ?? "";
      const email = cols[emailIdx] ?? "";
      const roleVal = (cols[roleIdx] ?? "org_user").toLowerCase();
      const adminVal = (cols[adminIdx] ?? "no").toLowerCase();
      const title = cols[titleIdx] ?? "";

      let error: string | undefined;
      if (!fullName) error = "Missing name";
      else if (!email || !email.includes("@")) error = "Invalid email";

      const role = VALID_ROLES.has(roleVal) ? (roleVal as UserRole) : "org_user";
      const isAdmin = adminVal === "yes" || adminVal === "true" || adminVal === "1";

      parsed.push({ fullName, email, role, isAdmin, title, error });
    }

    setRows(parsed);
  }, []);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      setFile(selectedFile);
      setResult(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== "string") {
          toast.error("Failed to read file");
          return;
        }
        parseCSV(text);
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsText(selectedFile);
    },
    [parseCSV]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && (droppedFile.name.endsWith(".csv") || droppedFile.type === "text/csv")) {
        handleFileSelect(droppedFile);
      } else {
        toast.error("Please upload a CSV file");
      }
    },
    [handleFileSelect]
  );

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      const res = await bulkInviteUsers(
        validRows.map((r) => ({
          fullName: r.fullName,
          email: r.email,
          role: r.role,
          isAdmin: r.isAdmin,
          title: r.title || undefined,
        }))
      );
      setResult({ invited: res.invited, skipped: res.skipped });
      if (res.invited > 0) {
        toast.success(`${res.invited} invitation${res.invited !== 1 ? "s" : ""} sent`);
        onComplete();
      }
      if (res.skipped.length > 0) {
        toast.warning(`${res.skipped.length} user${res.skipped.length !== 1 ? "s" : ""} skipped`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send invitations";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Bulk Invite Users
          </DialogTitle>
        </DialogHeader>

        {/* Result view */}
        {result ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg border bg-green-50 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  {result.invited} invitation{result.invited !== 1 ? "s" : ""} sent successfully
                </p>
                {result.skipped.length > 0 && (
                  <p className="text-sm text-green-700">
                    {result.skipped.length} skipped (see details below)
                  </p>
                )}
              </div>
            </div>

            {result.skipped.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.skipped.map((s) => (
                      <TableRow key={s.email}>
                        <TableCell className="font-mono text-sm">{s.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            {/* Step 1: Download template + upload */}
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Need the template? Download it to get started.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={downloadTemplate}
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Template
                </Button>
              </div>

              {/* Drop zone */}
              {!file ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10 p-8 transition-colors hover:border-primary/40"
                >
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drag & drop your CSV here
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                    style={{ position: "relative" }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".csv";
                      input.onchange = (e) => {
                        const f = (e.target as HTMLInputElement).files?.[0];
                        if (f) handleFileSelect(f);
                      };
                      input.click();
                    }}
                  >
                    Browse Files
                  </Button>
                </div>
              ) : (
                <>
                  {/* File loaded - show preview */}
                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {rows.length} row{rows.length !== 1 ? "s" : ""}
                      </Badge>
                      {errorRows.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {errorRows.length} error{errorRows.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={reset}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Preview table */}
                  {rows.length > 0 && (
                    <div className="max-h-64 overflow-auto rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Admin</TableHead>
                            <TableHead>Title</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rows.map((r, i) => (
                            <TableRow
                              key={r.email || i}
                              className={r.error ? "bg-red-50/50" : ""}
                            >
                              <TableCell className="px-2">
                                {r.error ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {r.fullName || (
                                  <span className="text-red-500">—</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {r.email || (
                                  <span className="text-red-500">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {r.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                {r.isAdmin ? "Yes" : "No"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {r.title || "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {errorRows.length > 0 && (
                    <p className="text-xs text-red-600">
                      {errorRows.length} row{errorRows.length !== 1 ? "s" : ""}{" "}
                      with errors will be skipped.
                    </p>
                  )}
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={validRows.length === 0 || submitting}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                {submitting
                  ? "Sending invitations..."
                  : `Invite ${validRows.length} User${validRows.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
