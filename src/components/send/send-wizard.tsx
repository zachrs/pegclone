"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSendCart } from "@/lib/hooks/use-send-cart";
import { sendMessage, bulkSend } from "@/lib/actions/send";
import { toast } from "sonner";

type SendMode = "single" | "qr" | "bulk";

export function SendWizard() {
  const { items, clear } = useSendCart();
  const [mode, setMode] = useState<SendMode>("single");
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [sentContact, setSentContact] = useState("");
  const [sentChannel, setSentChannel] = useState("");
  const [qrGenerated, setQrGenerated] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<string[][]>([]);
  const [bulkSentState, setBulkSentState] = useState(false);
  const [bulkCount, setBulkCount] = useState(0);
  const [sending, setSending] = useState(false);

  const isEmail = contact.includes("@");
  const isPhone = /^\+?\d[\d\s()-]{6,}$/.test(contact.trim());
  const isValid = contact.trim().length > 0 && (isEmail || isPhone);
  const channel = isEmail ? "email" : "sms";

  const contentBlocks = items.map((item, i) => ({
    type: "content_item" as const,
    content_item_id: item.id,
    order: i + 1,
  }));

  const handleSend = async () => {
    if (!isValid || items.length === 0 || sending) return;
    setSending(true);
    try {
      await sendMessage({
        recipientContact: contact.trim(),
        contentBlocks,
        deliveryChannel: channel,
      });
      setSentContact(contact.trim());
      setSentChannel(channel === "email" ? "email" : "SMS");
      setSent(true);
      clear();
      toast.success(`Message sent via ${channel === "email" ? "email" : "SMS"}`);
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleQrGenerate = async () => {
    if (items.length === 0 || sending) return;
    setSending(true);
    try {
      await sendMessage({
        recipientContact: "QR Code",
        contentBlocks,
        deliveryChannel: "qr_code",
      });
      setQrGenerated(true);
      clear();
      toast.success("QR code generated");
    } catch {
      toast.error("Failed to generate QR code");
    } finally {
      setSending(false);
    }
  };

  const handleBulkUpload = (file: File) => {
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.trim().split("\n");
      const rows = lines.map((l) => l.split(",").map((c) => c.trim()));
      setBulkPreview(rows);
    };
    reader.readAsText(file);
  };

  const handleBulkSend = async () => {
    if (bulkPreview.length < 2 || items.length === 0 || sending) return;
    setSending(true);
    try {
      const dataRows = bulkPreview.slice(1); // skip header
      const contacts = dataRows.map((row) => row[2]?.trim()).filter((c): c is string => Boolean(c));

      const results = await bulkSend({ contacts, contentBlocks });
      setBulkCount(results.length);
      setBulkSentState(true);
      clear();
      toast.success(`Sent to ${results.length} recipients`);
    } catch {
      toast.error("Bulk send failed");
    } finally {
      setSending(false);
    }
  };

  const resetAll = () => {
    setSent(false);
    setContact("");
    setSentContact("");
    setSentChannel("");
    setQrGenerated(false);
    setBulkFile(null);
    setBulkPreview([]);
    setBulkSentState(false);
    setBulkCount(0);
    setMode("single");
  };

  // ── Success states ───────────────────────────────────────────────────

  if (sent) {
    return (
      <SuccessScreen
        title="Sent!"
        subtitle={
          <>
            Materials sent to{" "}
            <span className="font-mono font-medium text-foreground">{sentContact}</span>{" "}
            via {sentChannel}.
          </>
        }
        onReset={resetAll}
      />
    );
  }

  if (qrGenerated) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 16l5.5 5.5L24 10" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">QR Code Generated</h2>
          <p className="mt-1 text-muted-foreground">Print or display this code for patients to scan.</p>
        </div>
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
          <div className="grid h-40 w-40 grid-cols-5 grid-rows-5 gap-1">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`rounded-sm ${[0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 19, 20, 22, 23, 24].includes(i) ? "bg-gray-900" : "bg-white"}`} />
            ))}
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">peg.app/m/qr-demo-token</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => toast.info("Download would trigger in production")}>Download PNG</Button>
          <Button variant="outline" onClick={() => toast.info("Print dialog would open in production")}>Print</Button>
        </div>
        <Button variant="ghost" onClick={resetAll}>Send More</Button>
      </div>
    );
  }

  if (bulkSentState) {
    return (
      <SuccessScreen
        title="Bulk Send Complete!"
        subtitle={
          <>
            Materials sent to <span className="font-medium text-foreground">{bulkCount}</span> recipients.
            Delivery status will appear in Recipients.
          </>
        }
        onReset={resetAll}
      />
    );
  }

  // ── Empty cart ───────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold">No content selected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Go to the Library to browse and select items, then come back here to send them.
          </p>
        </div>
        <Button variant="outline" onClick={() => { window.location.href = "/library"; }}>Go to Library</Button>
      </div>
    );
  }

  // ── Main send form ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sending {items.length} item{items.length !== 1 ? "s" : ""}
        </h2>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-md border bg-orange-50 px-3 py-2 text-sm">
              <span className="flex-1 font-medium">{item.title}</span>
              <Badge variant="outline" className="text-xs">{item.type === "pdf" ? "PDF" : "Link"}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Mode tabs */}
      <div className="mb-6">
        <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
          {([{ key: "single", label: "Single Recipient" }, { key: "bulk", label: "Bulk CSV" }, { key: "qr", label: "QR Code" }] as const).map((tab) => (
            <button
              key={tab.key}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === tab.key ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setMode(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Single recipient mode */}
      {mode === "single" && (
        <>
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium">Email or Mobile Phone (U.S. Only)</label>
            <Input placeholder="example@email.com, 888-555-5555" value={contact} onChange={(e) => setContact(e.target.value)} className="h-12 border-2 border-gray-200 text-base focus:border-purple-400" />
            {contact.trim() && isValid && <p className="mt-1.5 text-xs text-muted-foreground">Will send via {isEmail ? "email" : "SMS"}</p>}
            {contact.trim() && !isValid && <p className="mt-1.5 text-xs text-red-500">Enter a valid email address or phone number</p>}
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { window.location.href = "/library"; }}>Keep Adding</Button>
            <Button className="bg-purple-700 hover:bg-purple-800" onClick={handleSend} disabled={!isValid || sending}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </>
      )}

      {/* Bulk CSV mode */}
      {mode === "bulk" && (
        <>
          {!bulkFile ? (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium">Upload CSV File</label>
              <div
                className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-10 transition-colors hover:border-purple-300"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files[0]; if (file && file.name.endsWith(".csv")) handleBulkUpload(file); }}
              >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <p className="text-sm text-muted-foreground">Drag a CSV file here or click to upload</p>
                <p className="text-xs text-muted-foreground">Required columns: first_name, last_name, contact</p>
                <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleBulkUpload(file); }} />
                <Button variant="outline" size="sm" onClick={() => document.getElementById("csv-upload")?.click()}>Choose File</Button>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{bulkFile.name}</p>
                  <p className="text-xs text-muted-foreground">{bulkPreview.length - 1} recipient{bulkPreview.length - 1 !== 1 ? "s" : ""} found</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setBulkFile(null); setBulkPreview([]); }}>Remove</Button>
              </div>
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {bulkPreview[0]?.map((header, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.slice(1, 6).map((row, ri) => (
                      <tr key={ri} className="border-b">
                        {row.map((cell, ci) => <td key={ci} className="px-3 py-1.5">{cell}</td>)}
                      </tr>
                    ))}
                    {bulkPreview.length > 6 && (
                      <tr><td colSpan={bulkPreview[0]?.length} className="px-3 py-1.5 text-center text-xs text-muted-foreground">... and {bulkPreview.length - 6} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { window.location.href = "/library"; }}>Keep Adding</Button>
            <Button className="bg-purple-700 hover:bg-purple-800" onClick={handleBulkSend} disabled={!bulkFile || bulkPreview.length < 2 || sending}>
              {sending ? "Sending..." : `Send to ${Math.max(0, bulkPreview.length - 1)} Recipients`}
            </Button>
          </div>
        </>
      )}

      {/* QR Code mode */}
      {mode === "qr" && (
        <>
          <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <h3 className="font-medium">How QR Code Sending Works</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="shrink-0 text-purple-600">1.</span>A single shareable link is created for the selected content.</li>
              <li className="flex gap-2"><span className="shrink-0 text-purple-600">2.</span>A QR code is generated that points to this link.</li>
              <li className="flex gap-2"><span className="shrink-0 text-purple-600">3.</span>Download or print the QR code and display it in your office.</li>
              <li className="flex gap-2"><span className="shrink-0 text-purple-600">4.</span>Any patient can scan it to access the materials — no login needed.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Note: QR code sends track aggregate scan count only. Individual recipient tracking and reminders are not available.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => { window.location.href = "/library"; }}>Keep Adding</Button>
            <Button className="bg-purple-700 hover:bg-purple-800" onClick={handleQrGenerate} disabled={sending}>
              {sending ? "Generating..." : "Generate QR Code"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function SuccessScreen({ title, subtitle, onReset }: { title: string; subtitle: React.ReactNode; onReset: () => void }) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M8 16l5.5 5.5L24 10" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="outline" onClick={onReset}>Send More</Button>
    </div>
  );
}
