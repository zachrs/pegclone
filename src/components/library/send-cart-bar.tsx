"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { sendMessage, bulkSend } from "@/lib/actions/send";
import { searchRecipients } from "@/lib/actions/recipients";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Check,
  X,
  Send,
  Mail,
  MessageSquare,
  MailPlus,
  QrCode,
  FileUp,
  FileText,
  Link as LinkIcon,
  CircleCheck,
  Clock,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";

export function SendCartBar() {
  const { items, clear } = useSendCart();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border bg-primary/5 px-4 py-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {items.length} Selected
        </Badge>
        <Button
          size="sm"
          onClick={() => setSendDialogOpen(true)}
        >
          Send
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={clear}
        >
          Clear
        </Button>
      </div>

      <SendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        items={items}
      />
    </>
  );
}

// ── Types ──────────────────────────────────────────────────────────────
type SendStep = 1 | 2 | 3;
type SendMode = "single" | "bulk";
type DeliveryChannel = "sms" | "email" | "qr_code" | "sms_and_email";

const STEP_LABELS = ["Add Recipients", "Configure Delivery", "Preview & Send"];

// ── Full Send Dialog ──────────────────────────────────────────────────
function SendDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
}) {
  const { clear } = useSendCart();
  const [step, setStep] = useState<SendStep>(1);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentInfo, setSentInfo] = useState({ count: 0, channel: "", qr: false });

  // Step 1: Recipients
  const [mode, setMode] = useState<SendMode>("single");
  const [contact, setContact] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [rosterQuery, setRosterQuery] = useState("");
  const [rosterResults, setRosterResults] = useState<Array<{
    id: string; firstName: string | null; lastName: string | null;
    contact: string; contactType: string;
  }>>([]);
  const [rosterSearching, setRosterSearching] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string[][]>([]);
  const [bulkName, setBulkName] = useState("");

  // Step 2: Delivery config
  const [channel, setChannel] = useState<DeliveryChannel>("email");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderMax, setReminderMax] = useState(3);
  const [reminderIntervalHours, setReminderIntervalHours] = useState(24);

  // QR state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrViewerUrl, setQrViewerUrl] = useState<string | null>(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep(1);
      setSent(false);
      setContact("");
      setFirstName("");
      setLastName("");
      setPersonalNote("");
      setMode("single");
      setBulkFile(null);
      setBulkPreview([]);
      setBulkName("");
      setChannel("email");
      setScheduleMode("now");
      setRemindersEnabled(true);
      setQrDataUrl(null);
      setQrViewerUrl(null);
    }
  }, [open]);

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
        .catch(() => {})
        .finally(() => setRosterSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [rosterQuery]);

  const isEmail = contact.includes("@");
  const isPhone = /^\+?\d[\d\s()-]{6,}$/.test(contact.trim());
  const isValidContact = contact.trim().length > 0 && (isEmail || isPhone);

  const contentBlocks = items.map((item, i) => ({
    type: "content_item" as const,
    content_item_id: item.id,
    order: i + 1,
  }));

  // File upload
  const handleFileUpload = useCallback((file: File) => {
    setBulkFile(file);
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return;
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return;
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        setBulkPreview(rows.map((r) => r.map(String)));
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.trim().split("\n");
        setBulkPreview(lines.map((l) => l.split(",").map((c) => c.trim())));
      };
      reader.readAsText(file);
    }
  }, []);

  // Validation
  const canProceed = () => {
    if (step === 1) {
      if (channel === "qr_code") return true;
      if (mode === "single") return isValidContact;
      return bulkPreview.length > 1;
    }
    return true;
  };

  // Send
  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    try {
      const scheduledAt = scheduleMode === "later" && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`)
        : undefined;

      if (mode === "single" && channel !== "qr_code") {
        const effectiveChannel = channel === "sms_and_email" ? "email" : channel;
        await sendMessage({
          recipientContact: contact.trim(),
          contentBlocks,
          deliveryChannel: effectiveChannel as "sms" | "email",
          scheduledAt,
        });
        if (channel === "sms_and_email") {
          await sendMessage({
            recipientContact: contact.trim(),
            contentBlocks,
            deliveryChannel: "sms",
            scheduledAt,
          });
        }
        setSentInfo({ count: 1, channel: channel === "sms_and_email" ? "SMS & Email" : channel, qr: false });
      } else if (channel === "qr_code") {
        const result = await sendMessage({
          recipientContact: "QR Code",
          contentBlocks,
          deliveryChannel: "qr_code",
        });
        const appUrl = window.location.origin;
        const viewerUrl = `${appUrl}/m/${result.accessToken}`;
        setQrViewerUrl(viewerUrl);
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(viewerUrl, { width: 300, margin: 2 });
        setQrDataUrl(dataUrl);
        setSentInfo({ count: 1, channel: "QR Code", qr: true });
      } else {
        const dataRows = bulkPreview.slice(1);
        const contacts = dataRows.map((row) => row[2]?.trim()).filter((c): c is string => Boolean(c));
        const results = await bulkSend({
          contacts,
          contentBlocks,
          name: bulkName || undefined,
          deliveryChannel: (channel as string) === "qr_code" ? "email" : channel as "sms" | "email" | "sms_and_email",
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

  // ── Success screen ────────────────────────────────────────────────
  if (sent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <div className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CircleCheck className="h-7 w-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Message sent</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sentInfo.qr
                  ? "QR code generated. Print or display for patients to scan."
                  : sentInfo.count === 1
                    ? `Sent via ${sentInfo.channel}.`
                    : `Sent to ${sentInfo.count} recipients.`}
              </p>
            </div>
            {sentInfo.qr && qrDataUrl && (
              <div className="rounded-xl border-2 border-dashed p-4">
                <img src={qrDataUrl} alt="QR Code" className="mx-auto h-40 w-40" />
                {qrViewerUrl && (
                  <p className="mt-2 max-w-[200px] break-all font-mono text-xs text-muted-foreground">{qrViewerUrl}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    const a = document.createElement("a");
                    a.href = qrDataUrl;
                    a.download = "peg-qr-code.png";
                    a.click();
                  }}>Download</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const w = window.open();
                    if (w) {
                      w.document.write(`<img src="${qrDataUrl}" />`);
                      w.document.close();
                      w.print();
                    }
                  }}>Print</Button>
                </div>
              </div>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Main dialog ───────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Send {items.length} item{items.length !== 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>

        {/* Mini stepper */}
        <div className="mb-4">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-border" />
            <div
              className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-500"
              style={{ width: `${((step - 1) / (STEP_LABELS.length - 1)) * 100}%` }}
            />
            {STEP_LABELS.map((label, i) => {
              const stepNum = (i + 1) as SendStep;
              const isActive = step === stepNum;
              const isComplete = step > stepNum;
              return (
                <div key={i} className="relative flex flex-col items-center gap-1.5">
                  <button
                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground scale-110"
                        : isComplete
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 bg-background text-muted-foreground"
                    }`}
                    onClick={() => { if (isComplete) setStep(stepNum); }}
                    disabled={!isComplete && !isActive}
                  >
                    {isComplete ? <Check className="h-3 w-3" /> : stepNum}
                  </button>
                  <span className={`text-[10px] font-medium ${
                    isActive ? "text-primary" : isComplete ? "text-primary/70" : "text-muted-foreground"
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected content summary */}
        <div className="mb-4 rounded-lg border bg-muted/30 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Sending:</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span key={item.id} className="inline-flex items-center gap-1 rounded-md bg-card border px-2 py-0.5 text-xs font-medium">
                {item.type === "pdf" ? <FileText className="h-3 w-3 text-red-500" /> : <LinkIcon className="h-3 w-3 text-blue-500" />}
                {item.title}
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1: Recipients ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex gap-1 rounded-xl border bg-muted/50 p-1" role="tablist">
              {([
                { key: "single" as const, label: "Single Recipient" },
                { key: "bulk" as const, label: "Bulk Upload" },
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

            {mode === "single" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dlg-first-name" className="text-xs">First Name</Label>
                    <Input id="dlg-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="dlg-last-name" className="text-xs">Last Name</Label>
                    <Input id="dlg-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="dlg-contact" className="text-xs">Email or Phone</Label>
                  <Input
                    id="dlg-contact"
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

                {/* Roster search */}
                <div className="rounded-xl border bg-muted/30 p-3">
                  <Label htmlFor="dlg-roster" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Or search existing recipients</Label>
                  <Input
                    id="dlg-roster"
                    placeholder="Search by name, email, or phone..."
                    value={rosterQuery}
                    onChange={(e) => setRosterQuery(e.target.value)}
                    className="mt-1.5"
                  />
                  {rosterSearching && <p className="mt-1.5 text-xs text-muted-foreground">Searching...</p>}
                  {rosterResults.length > 0 && (
                    <div className="mt-1.5 max-h-32 space-y-0.5 overflow-auto">
                      {rosterResults.map((r) => (
                        <button
                          key={r.id}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-card"
                          onClick={() => {
                            setContact(r.contact);
                            setFirstName(r.firstName ?? "");
                            setLastName(r.lastName ?? "");
                            setRosterQuery("");
                            setRosterResults([]);
                          }}
                        >
                          <span className="flex-1 font-medium text-xs">
                            {r.firstName || r.lastName
                              ? `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim()
                              : "No name"}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">{r.contact}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {r.contactType === "email" ? "Email" : "SMS"}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Personal note */}
                <div>
                  <Label htmlFor="dlg-note" className="text-xs">Personal Note (optional)</Label>
                  <textarea
                    id="dlg-note"
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="Add a personal message..."
                    rows={2}
                    className="mt-1 w-full rounded-lg border bg-card px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  />
                </div>
              </div>
            )}

            {mode === "bulk" && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="dlg-bulk-name" className="text-xs">Campaign Name</Label>
                  <Input
                    id="dlg-bulk-name"
                    value={bulkName}
                    onChange={(e) => setBulkName(e.target.value)}
                    placeholder="e.g., Flu Shot Reminder - Oct 2025"
                    className="mt-1"
                  />
                </div>

                {!bulkFile ? (
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 py-8 transition-colors hover:border-primary/40 hover:bg-muted/50"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file && (file.name.endsWith(".csv") || file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
                        handleFileUpload(file);
                      }
                    }}
                  >
                    <FileUp className="h-6 w-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Drag a CSV or Excel file here</p>
                    <p className="text-xs text-muted-foreground">Required columns: first_name, last_name, contact</p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="hidden"
                      id="dlg-file-upload"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }}
                    />
                    <Button variant="outline" size="sm" onClick={() => document.getElementById("dlg-file-upload")?.click()}>Choose File</Button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{bulkFile.name}</p>
                        <p className="text-xs text-muted-foreground">{bulkPreview.length - 1} recipient{bulkPreview.length - 1 !== 1 ? "s" : ""}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { setBulkFile(null); setBulkPreview([]); }}>Remove</Button>
                    </div>
                    <div className="max-h-36 overflow-auto rounded-lg border text-sm">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            {bulkPreview[0]?.map((header, i) => (
                              <th key={i} className="px-2 py-1.5 text-left text-xs font-medium text-muted-foreground">{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {bulkPreview.slice(1, 6).map((row, ri) => (
                            <tr key={ri} className="border-b last:border-0">
                              {row.map((cell, ci) => <td key={ci} className="px-2 py-1 text-xs">{cell}</td>)}
                            </tr>
                          ))}
                          {bulkPreview.length > 6 && (
                            <tr><td colSpan={bulkPreview[0]?.length} className="px-2 py-1 text-center text-xs text-muted-foreground">... and {bulkPreview.length - 6} more</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Delivery Config ────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block text-xs font-medium">Delivery Channel</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  { key: "email" as const, label: "Email", Icon: Mail },
                  { key: "sms" as const, label: "SMS", Icon: MessageSquare },
                  { key: "sms_and_email" as const, label: "Both", Icon: MailPlus },
                  ...(mode === "single" ? [{ key: "qr_code" as const, label: "QR Code", Icon: QrCode }] : []),
                ]).map((opt) => (
                  <button
                    key={opt.key}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-xs font-medium transition-all ${
                      channel === opt.key
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setChannel(opt.key)}
                  >
                    <opt.Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block text-xs font-medium">Schedule</Label>
              <div className="flex gap-2">
                <button
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all ${
                    scheduleMode === "now" ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setScheduleMode("now")}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Now
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 p-2.5 text-xs font-medium transition-all ${
                    scheduleMode === "later" ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setScheduleMode("later")}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </button>
              </div>
              {scheduleMode === "later" && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="dlg-sched-date" className="text-xs">Date</Label>
                    <Input id="dlg-sched-date" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="dlg-sched-time" className="text-xs">Time</Label>
                    <Input id="dlg-sched-time" type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
            </div>

            {channel !== "qr_code" && (
              <div className="rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium">Automated Reminders</p>
                    <p className="text-[10px] text-muted-foreground">Follow-up if recipient hasn&apos;t opened</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={remindersEnabled}
                    className={`relative h-5 w-9 rounded-full transition-colors ${remindersEnabled ? "bg-primary" : "bg-muted"}`}
                    onClick={() => setRemindersEnabled(!remindersEnabled)}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${remindersEnabled ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                {remindersEnabled && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="dlg-rem-max" className="text-[10px]">Max Reminders</Label>
                      <select
                        id="dlg-rem-max"
                        value={reminderMax}
                        onChange={(e) => setReminderMax(Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border px-2 py-1.5 text-xs"
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="dlg-rem-interval" className="text-[10px]">Interval (hours)</Label>
                      <Input id="dlg-rem-interval" type="number" min={1} max={168} value={reminderIntervalHours} onChange={(e) => setReminderIntervalHours(Number(e.target.value))} className="mt-1" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Preview & Send ─────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send Summary</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Content items</dt>
                  <dd className="font-medium">{items.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Recipient{mode === "bulk" ? "s" : ""}</dt>
                  <dd className="font-medium">
                    {mode === "single"
                      ? channel === "qr_code"
                        ? "QR Code (anyone who scans)"
                        : contact
                      : `${bulkPreview.length - 1} recipients`}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Channel</dt>
                  <dd className="font-medium">
                    {channel === "sms_and_email" ? "SMS & Email" : channel === "qr_code" ? "QR Code" : channel.toUpperCase()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Schedule</dt>
                  <dd className="font-medium">
                    {scheduleMode === "now" ? "Send immediately" : `${scheduledDate} at ${scheduledTime}`}
                  </dd>
                </div>
                {channel !== "qr_code" && (
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

            {/* Content preview */}
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg border bg-card p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    {item.type === "pdf" ? <FileText className="h-3.5 w-3.5 text-primary" /> : <LinkIcon className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <span className="text-sm font-medium">{item.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{item.type === "pdf" ? "PDF" : "Link"}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div>
            {step > 1 ? (
              <Button variant="outline" size="sm" onClick={() => setStep((step - 1) as SendStep)} className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <Button
                size="sm"
                onClick={() => setStep((step + 1) as SendStep)}
                disabled={!canProceed()}
                className="gap-1.5"
              >
                Continue
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending}
                className="gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                {sending ? "Sending..." : scheduleMode === "later" ? "Schedule Send" : "Send Now"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
