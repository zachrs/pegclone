"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useSendCart } from "@/lib/hooks/use-send-cart";
import { sendMessage, bulkSend } from "@/lib/actions/send";
import { searchRecipients } from "@/lib/actions/recipients";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Check,
  X,
  GripVertical,
  Send,
  QrCode,
  FileUp,
  Library,
  CircleCheck,
  Clock,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type SendMode = "single" | "bulk" | "qr_code";

const STEP_LABELS = ["Review Content", "Add Recipients", "Schedule", "Preview & Send"];

export function SendWizard() {
  const router = useRouter();
  const { items, removeItem, clear } = useSendCart();
  const [step, setStep] = useState<Step>(1);
  const [sending, setSending] = useState(false);

  // Step 1 state
  const [orderedItems, setOrderedItems] = useState(items);
  const [personalNote, setPersonalNote] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Step 2 state
  const [mode, setMode] = useState<SendMode>("single");
  const [contact, setContact] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rosterQuery, setRosterQuery] = useState("");
  const [rosterResults, setRosterResults] = useState<Array<{
    id: string; firstName: string | null; lastName: string | null;
    contact: string; contactType: string;
  }>>([]);
  const [rosterSearching, setRosterSearching] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string[][]>([]);
  const [bulkName, setBulkName] = useState("");

  // Step 3 state
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderMax, setReminderMax] = useState(3);
  const [reminderIntervalHours, setReminderIntervalHours] = useState(24);

  // Success state
  const [sent, setSent] = useState(false);
  const [sentInfo, setSentInfo] = useState({ count: 0, channel: "", qr: false });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrViewerUrl, setQrViewerUrl] = useState<string | null>(null);

  useEffect(() => { setOrderedItems(items); }, [items]);

  // Roster search
  useEffect(() => {
    if (!rosterQuery || rosterQuery.length < 2) {
      setRosterResults([]);
      return;
    }
    setRosterSearching(true);
    const timer = setTimeout(() => {
      searchRecipients(rosterQuery)
        .then(setRosterResults)
        .catch(() => {
          toast.error("Search failed. Please try again.");
        })
        .finally(() => setRosterSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [rosterQuery]);

  const isEmail = contact.includes("@");
  const isPhone = /^\+?[1-9]\d{1,14}$/.test(contact.trim().replace(/[\s()-]/g, ""));
  const isValidContact = contact.trim().length > 0 && (isEmail || isPhone);

  // Auto-detect delivery channel from contact type
  const detectedChannel: "sms" | "email" = isEmail ? "email" : "sms";

  const contentBlocks = orderedItems.map((item, i) => ({
    type: "content_item" as const,
    content_item_id: item.id,
    order: i + 1,
  }));

  // Drag-and-drop handlers
  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newItems = [...orderedItems];
    const removed = newItems.splice(dragIdx, 1);
    if (!removed[0]) return;
    newItems.splice(idx, 0, removed[0]);
    setOrderedItems(newItems);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  // File upload (CSV + Excel)
  const handleFileUpload = useCallback((file: File) => {
    setBulkFile(file);
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (!result || typeof result === "string") {
          toast.error("Failed to read file");
          return;
        }
        const data = new Uint8Array(result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return;
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        setBulkPreview(rows.map((r) => r.map(String)));
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text !== "string") {
          toast.error("Failed to read file");
          return;
        }
        const lines = text.trim().split("\n");
        setBulkPreview(lines.map((l) => l.split(",").map((c) => c.trim())));
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsText(file);
    }
  }, []);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);

    try {
      const scheduledAt = scheduleMode === "later" && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`)
        : undefined;

      if (mode === "single") {
        await sendMessage({
          recipientContact: contact.trim(),
          contentBlocks,
          deliveryChannel: detectedChannel,
          scheduledAt,
        });
        setSentInfo({ count: 1, channel: detectedChannel === "sms" ? "SMS" : "Email", qr: false });
      } else if (mode === "qr_code") {
        const result = await sendMessage({
          recipientContact: "QR Code",
          contentBlocks,
          deliveryChannel: "qr_code",
        });
        const appUrl = window.location.origin;
        const viewerUrl = `${appUrl}/m/${result.accessToken}`;
        setQrViewerUrl(viewerUrl);
        const { generateQRDataUrl } = await import("@/lib/utils/qr");
        const dataUrl = await generateQRDataUrl(viewerUrl);
        setQrDataUrl(dataUrl);
        setSentInfo({ count: 1, channel: "QR Code", qr: true });
      } else {
        // Bulk: auto-detect channel per contact
        const dataRows = bulkPreview.slice(1);
        const contacts = dataRows.map((row) => row[2]?.trim()).filter((c): c is string => Boolean(c));
        const results = await bulkSend({
          contacts,
          contentBlocks,
          name: bulkName || undefined,
          scheduledAt,
          reminders: remindersEnabled ? {
            enabled: true,
            maxReminders: reminderMax,
            intervalHours: reminderIntervalHours,
          } : undefined,
        });
        setSentInfo({ count: results.length, channel: "bulk", qr: false });
      }
      setSent(true);
      clear();
      toast.success("Message sent successfully");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const resetAll = () => {
    setSent(false);
    setStep(1);
    setContact("");
    setFirstName("");
    setLastName("");
    setPersonalNote("");
    setMode("single");
    setBulkFile(null);
    setBulkPreview([]);
    setBulkName("");
    setScheduleMode("now");
    setRemindersEnabled(true);
  };

  // ── Success screen ──────────────────────────────────────────────────
  if (sent) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CircleCheck className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Message sent</h2>
          <p className="mt-2 text-muted-foreground">
            {sentInfo.qr
              ? "QR code generated. Print or display for patients to scan."
              : sentInfo.count === 1
                ? `Sent via ${sentInfo.channel}.`
                : `Sent to ${sentInfo.count} recipients.`}
          </p>
        </div>
        {sentInfo.qr && qrDataUrl && (
          <div className="rounded-xl border-2 border-dashed p-6">
            <img src={qrDataUrl} alt="QR Code" className="h-48 w-48" />
            {qrViewerUrl && (
              <p className="mt-3 max-w-[200px] break-all font-mono text-xs text-muted-foreground">{qrViewerUrl}</p>
            )}
            <div className="mt-3 flex gap-3">
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement("a");
                a.href = qrDataUrl;
                a.download = "peg-qr-code.png";
                a.click();
              }}>Download PNG</Button>
              <Button variant="outline" size="sm" onClick={() => {
                const html = `<!DOCTYPE html><html><body><img src="${qrDataUrl.replace(/"/g, "&quot;")}" /></body></html>`;
                const blob = new Blob([html], { type: "text/html" });
                const url = URL.createObjectURL(blob);
                const w = window.open(url);
                if (w) {
                  w.onload = () => { w.print(); URL.revokeObjectURL(url); };
                } else {
                  URL.revokeObjectURL(url);
                }
              }}>Print</Button>
            </div>
          </div>
        )}
        <Button variant="outline" onClick={resetAll}>Send Another</Button>
      </div>
    );
  }

  // ── Empty cart ──────────────────────────────────────────────────────
  if (items.length === 0 && orderedItems.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Send className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No content selected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to the Library to browse and select items, then come back here to send them.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => { router.push("/library"); }}>
          <Library className="h-4 w-4" />
          Go to Library
        </Button>
      </div>
    );
  }

  // ── Stepper ────────────────────────────────────────────────────────
  // QR code skips the Schedule step (step 3)
  const nextStep = (current: Step): Step => {
    if (current === 2 && mode === "qr_code") return 4;
    return (current + 1) as Step;
  };
  const prevStep = (current: Step): Step => {
    if (current === 4 && mode === "qr_code") return 2;
    return (current - 1) as Step;
  };

  const canProceed = () => {
    if (step === 1) return orderedItems.length > 0;
    if (step === 2) {
      if (mode === "qr_code") return true;
      if (mode === "single") return isValidContact;
      return bulkPreview.length > 1;
    }
    if (step === 3) return true;
    return true;
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in-up">
      {/* Stepper header */}
      <div className="mb-8">
        {/* Progress bar */}
        <div className="relative mb-6">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
          />
          <div className="relative flex justify-between">
            {STEP_LABELS.map((label, i) => {
              const stepNum = (i + 1) as Step;
              const isActive = step === stepNum;
              const isComplete = step > stepNum;
              return (
                <button
                  key={label}
                  className="flex flex-col items-center gap-2"
                  onClick={() => { if (isComplete && !(stepNum === 3 && mode === "qr_code")) setStep(stepNum); }}
                  disabled={!isComplete && !isActive}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300 ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-110"
                        : isComplete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                    }`}
                  >
                    {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNum}
                  </div>
                  <span className={`hidden text-xs font-medium sm:block ${
                    isActive ? "text-primary" : isComplete ? "text-primary/70" : "text-muted-foreground"
                  }`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Step 1: Review Content ─────────────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Review Selected Content</h2>
          <p className="mb-4 text-sm text-muted-foreground">Drag items to reorder. Remove items you don&apos;t need.</p>

          <div className="space-y-2">
            {orderedItems.map((item, idx) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm transition-all ${
                  dragIdx === idx
                    ? "border-primary bg-primary/5 shadow-md"
                    : "hover:shadow-md"
                } cursor-grab active:cursor-grabbing`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                <span className="flex-1 text-sm font-medium">{item.title}</span>
                <Badge variant="outline" className="text-xs">
                  {item.type === "pdf" ? <><FileText className="mr-1 h-3 w-3" />PDF</> : <><LinkIcon className="mr-1 h-3 w-3" />Link</>}
                </Badge>
                <button
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => {
                    removeItem(item.id);
                    setOrderedItems((prev) => prev.filter((i) => i.id !== item.id));
                  }}
                  aria-label="Remove item"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Label htmlFor="personal-note">Personal Note (optional)</Label>
            <textarea
              id="personal-note"
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder="Add a personal message that will appear at the top of the patient viewer..."
              rows={3}
              className="mt-1 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Add Recipients ─────────────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Add Recipients</h2>
          <p className="mb-4 text-sm text-muted-foreground">Enter a recipient, upload a list, or generate a QR code.</p>

          <div className="mb-6">
            <div className="flex gap-1 rounded-xl border bg-muted/50 p-1" role="tablist">
              {([
                { key: "single" as const, label: "Single Recipient" },
                { key: "bulk" as const, label: "Bulk Upload" },
                { key: "qr_code" as const, label: "QR Code" },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={mode === tab.key}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    mode === tab.key
                      ? "bg-card shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setMode(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {mode === "single" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="mt-1" />
                </div>
              </div>

              <div>
                <Label htmlFor="send-contact">Email or Mobile Phone</Label>
                <Input
                  id="send-contact"
                  placeholder="example@email.com or 888-555-5555"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="mt-1"
                />
                {contact.trim() && isValidContact && (
                  <p className="mt-1 text-xs text-muted-foreground">Will send via {isEmail ? "email" : "SMS"}</p>
                )}
                {contact.trim() && !isValidContact && (
                  <p className="mt-1 text-xs text-destructive">Enter a valid email address or phone number</p>
                )}
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <Label htmlFor="roster-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Or search existing recipients</Label>
                <Input
                  id="roster-search"
                  placeholder="Search by name, email, or phone..."
                  value={rosterQuery}
                  onChange={(e) => setRosterQuery(e.target.value)}
                  className="mt-2"
                />
                {rosterSearching && <p className="mt-2 text-xs text-muted-foreground">Searching...</p>}
                {rosterResults.length > 0 && (
                  <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                    {rosterResults.map((r) => (
                      <button
                        key={r.id}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-card"
                        onClick={() => {
                          setContact(r.contact);
                          setFirstName(r.firstName ?? "");
                          setLastName(r.lastName ?? "");
                          setRosterQuery("");
                          setRosterResults([]);
                        }}
                      >
                        <span className="flex-1 font-medium">
                          {r.firstName || r.lastName
                            ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
                            : "No name"}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{r.contact}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.contactType === "email" ? "Email" : "SMS"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "bulk" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="bulk-name">Send Name</Label>
                <Input
                  id="bulk-name"
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="e.g., Flu Shot Reminder - Oct 2025"
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Name this bulk send for tracking in analytics.</p>
              </div>

              {!bulkFile ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed bg-muted/30 py-10 transition-colors hover:border-primary/40 hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
                      handleFileUpload(file);
                    }
                  }}
                >
                  <FileUp className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Drag a CSV or Excel file here</p>
                  <p className="text-xs text-muted-foreground">Required columns: first_name, last_name, contact</p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    id="file-upload"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                  />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("file-upload")?.click()}>Choose File</Button>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{bulkFile.name}</p>
                      <p className="text-xs text-muted-foreground">{bulkPreview.length - 1} recipient{bulkPreview.length - 1 !== 1 ? "s" : ""} found</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setBulkFile(null); setBulkPreview([]); }}>Remove</Button>
                  </div>
                  <div className="max-h-48 overflow-auto rounded-xl border shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {bulkPreview[0]?.map((header, i) => (
                            <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{header}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bulkPreview.slice(1, 6).map((row, ri) => (
                          <tr key={ri} className="border-b last:border-0">
                            {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5">{cell}</td>)}
                          </tr>
                        ))}
                        {bulkPreview.length > 6 && (
                          <tr><td colSpan={bulkPreview[0]?.length} className="px-3 py-1.5 text-center text-xs text-muted-foreground">... and {bulkPreview.length - 6} more</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Delivery channel will be auto-detected per contact (email or SMS).</p>
                </div>
              )}
            </div>
          )}

          {mode === "qr_code" && (
            <div className="rounded-xl border bg-muted/30 p-6 text-center">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-semibold">Generate a QR Code</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                A scannable QR code will be created for this content. Print it or display it for patients to scan with their phone. No contact info needed.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Schedule ───────────────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Schedule</h2>
          <p className="mb-6 text-sm text-muted-foreground">Choose when to deliver and configure reminders.</p>

          <div className="mb-6">
            <Label className="mb-3 block text-sm font-medium">When to send</Label>
            <div className="flex gap-2">
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                  scheduleMode === "now" ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setScheduleMode("now")}
              >
                <Send className="h-4 w-4" />
                Send Now
              </button>
              <button
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${
                  scheduleMode === "later" ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => setScheduleMode("later")}
              >
                <Clock className="h-4 w-4" />
                Schedule
              </button>
            </div>
            {scheduleMode === "later" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="sched-date">Date</Label>
                  <Input id="sched-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="sched-time">Time</Label>
                  <Input id="sched-time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            )}
          </div>

          {mode !== "qr_code" && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Automated Reminders</p>
                  <p className="text-xs text-muted-foreground">Send follow-up if the recipient hasn&apos;t opened</p>
                </div>
                <button
                  role="switch"
                  aria-checked={remindersEnabled}
                  className={`relative h-6 w-11 rounded-full transition-colors ${remindersEnabled ? "bg-primary" : "bg-muted"}`}
                  onClick={() => setRemindersEnabled(!remindersEnabled)}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${remindersEnabled ? "translate-x-5" : ""}`} />
                </button>
              </div>
              {remindersEnabled && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="rem-max" className="text-xs">Max Reminders</Label>
                    <select
                      id="rem-max"
                      value={reminderMax}
                      onChange={(e) => setReminderMax(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="rem-interval" className="text-xs">Interval (hours)</Label>
                    <Input id="rem-interval" type="number" min={1} max={168} value={reminderIntervalHours} onChange={(e) => setReminderIntervalHours(Number(e.target.value))} className="mt-1" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Preview & Send ────────────────────────────────── */}
      {step === 4 && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Preview & Send</h2>
          <p className="mb-6 text-sm text-muted-foreground">Review your message before sending.</p>

          <div className="mb-6 overflow-hidden rounded-2xl border shadow-md">
            <div className="bg-primary px-5 py-4 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg font-bold">O</div>
                <div>
                  <p className="font-semibold">Your Organization</p>
                  <p className="text-sm opacity-80">(555) 123-4567</p>
                </div>
              </div>
            </div>
            <div className="bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">JD</div>
                <div>
                  <p className="text-sm font-semibold">Dr. Jane Doe</p>
                  <p className="text-xs text-muted-foreground">MD</p>
                </div>
              </div>
              {personalNote && (
                <p className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground italic">&quot;{personalNote}&quot;</p>
              )}
            </div>
            <div className="space-y-1.5 bg-muted/30 px-5 py-3">
              {orderedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    {item.type === "pdf" ? (
                      <FileText className="h-4 w-4 text-primary" />
                    ) : (
                      <LinkIcon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{item.title}</span>
                  <Badge variant="outline" className="ml-auto text-xs">{item.type === "pdf" ? "PDF" : "Link"}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 rounded-xl border bg-card p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send Summary</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Content items</dt>
                <dd className="font-medium">{orderedItems.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Recipient{mode === "bulk" ? "s" : ""}</dt>
                <dd className="font-medium">
                  {mode === "single"
                    ? contact
                    : mode === "qr_code"
                      ? "QR Code (anyone who scans)"
                      : `${bulkPreview.length - 1} recipients`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery</dt>
                <dd className="font-medium">
                  {mode === "qr_code"
                    ? "QR Code"
                    : mode === "bulk"
                      ? "Auto-detected per contact"
                      : isEmail ? "Email" : "SMS"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Schedule</dt>
                <dd className="font-medium">
                  {scheduleMode === "now" ? "Send immediately" : `${scheduledDate} at ${scheduledTime}`}
                </dd>
              </div>
              {mode !== "qr_code" && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Reminders</dt>
                  <dd className="font-medium">
                    {remindersEnabled ? `${reminderMax} reminders, every ${reminderIntervalHours}h` : "Disabled"}
                  </dd>
                </div>
              )}
              {personalNote && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Personal note</dt>
                  <dd className="max-w-[200px] truncate text-right font-medium">{personalNote}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ─────────────────────────────────────── */}
      <div className="mt-8 flex items-center justify-between border-t pt-4">
        <div>
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(prevStep(step))}>
              Back
            </Button>
          )}
          {step === 1 && (
            <Button variant="outline" className="gap-2" onClick={() => { router.push("/library"); }}>
              <Library className="h-4 w-4" />
              Add More Content
            </Button>
          )}
        </div>
        <div>
          {(step < 4 && !(step === 3 && mode === "qr_code")) ? (
            <Button
              onClick={() => setStep(nextStep(step))}
              disabled={!canProceed()}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "Sending..." : mode === "qr_code" ? "Generate QR Code" : scheduleMode === "later" ? "Schedule Send" : "Send Now"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
