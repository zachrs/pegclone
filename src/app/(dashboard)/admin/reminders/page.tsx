"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getReminderSettings, updateReminderSettings } from "@/lib/actions/admin";
import { toast } from "sonner";

export default function AdminRemindersPage() {
  const [enabled, setEnabled] = useState(true);
  const [defaultMax, setDefaultMax] = useState(3);
  const [intervalHours, setIntervalHours] = useState(24);

  useEffect(() => {
    getReminderSettings()
      .then((settings) => {
        setEnabled(settings.enabled);
        setDefaultMax(settings.defaultMax);
        setIntervalHours(settings.defaultIntervalHours);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    await updateReminderSettings({
      enabled,
      defaultMax,
      defaultIntervalHours: intervalHours,
    });
    toast.success("Reminder settings saved");
  };

  return (
    <>
      <Header title="Reminder Settings" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Enable/disable */}
          <section className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Automated Reminders</h2>
                <p className="text-sm text-muted-foreground">
                  When enabled, patients who haven&apos;t opened their message
                  will automatically receive follow-up reminders via the same
                  channel (SMS or email).
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label="Toggle automated reminders"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-purple-600" : "bg-gray-200"
                }`}
                onClick={() => setEnabled(!enabled)}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Configuration */}
          <section className={`rounded-lg border bg-white p-6 transition-opacity ${!enabled ? "pointer-events-none opacity-40" : ""}`}>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Default Configuration</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              These defaults apply to all outgoing messages. Individual users can override these at send time.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="reminder-max">Max Reminders Per Message</Label>
                <Select value={String(defaultMax)} onValueChange={(v) => setDefaultMax(Number(v))}>
                  <SelectTrigger id="reminder-max" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 (disabled)</SelectItem>
                    <SelectItem value="1">1 reminder</SelectItem>
                    <SelectItem value="2">2 reminders</SelectItem>
                    <SelectItem value="3">3 reminders</SelectItem>
                    <SelectItem value="4">4 reminders</SelectItem>
                    <SelectItem value="5">5 reminders</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">Reminders stop when the patient opens the message or the max is reached.</p>
              </div>
              <div>
                <Label htmlFor="reminder-interval">Hours Between Reminders</Label>
                <Input id="reminder-interval" type="number" min={1} max={168} value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} className="mt-1" />
                <p className="mt-1 text-xs text-muted-foreground">Minimum 1 hour, maximum 168 hours (7 days). Default is 24.</p>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">How Reminders Work</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">1</span>
                <p>A message is sent to a patient via SMS or email.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">2</span>
                <p>After {intervalHours} hours, the system checks if the patient has opened the message.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">3</span>
                <p>If not opened, a reminder is sent via the same channel. This repeats up to {defaultMax} times.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">✓</span>
                <p>Reminders stop immediately once the patient opens the message.</p>
              </div>
            </div>
          </section>

          {/* Reminder message preview */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reminder Message Preview</h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">SMS</p>
                <div className="mt-1 rounded-lg bg-gray-50 p-3 font-mono text-sm">
                  Acme Women&apos;s Health: A reminder that Dr. Sarah Mitchell has sent you health information. https://peg.app/m/abc123
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Email Subject</p>
                <div className="mt-1 rounded-lg bg-gray-50 p-3 font-mono text-sm">
                  Reminder: Acme Women&apos;s Health has sent you a message
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end">
            <Button onClick={handleSave}>Save Reminder Settings</Button>
          </div>
        </div>
      </main>
    </>
  );
}
