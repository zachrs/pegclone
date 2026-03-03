"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMessageTemplates,
  updateMessageTemplates,
  getDeliverySettings,
  updateDeliverySettings,
  getMfaSettings,
  updateMfaSettings,
  publishFolder,
  unpublishFolder,
} from "@/lib/actions/admin";
import { getFolders } from "@/lib/actions/library";
import { toast } from "sonner";

interface FolderRow {
  id: string;
  name: string;
  type: string;
  isPublished: boolean | null;
}

export default function AdminSettingsPage() {
  const [sms, setSms] = useState("[Organization Name] has sent you a message: [link]");
  const [emailSubject, setEmailSubject] = useState("[Organization Name] has sent you a message");
  const [emailBody, setEmailBody] = useState("[Organization Name] has sent you a message. Click the link below to view it: [link]");
  const [linkExpDays, setLinkExpDays] = useState(30);
  const [optOutFooter, setOptOutFooter] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaSaving, setMfaSaving] = useState(false);
  const [allFolders, setAllFolders] = useState<FolderRow[]>([]);

  const loadFolders = useCallback(() => {
    getFolders()
      .then((data) => setAllFolders(data as FolderRow[]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getMessageTemplates()
      .then((t) => { setSms(t.sms); setEmailSubject(t.emailSubject); setEmailBody(t.emailBody); })
      .catch(() => {});
    getDeliverySettings()
      .then((d) => { setLinkExpDays(d.linkExpirationDays); setOptOutFooter(d.optOutFooter); })
      .catch(() => {});
    getMfaSettings()
      .then((s) => setMfaRequired(s.required))
      .catch(() => {});
    loadFolders();
  }, [loadFolders]);

  const saveTemplates = async () => {
    await updateMessageTemplates({ sms: sms.trim(), emailSubject: emailSubject.trim(), emailBody: emailBody.trim() });
    toast.success("Message templates saved");
  };

  const saveDelivery = async () => {
    try {
      await updateDeliverySettings({
        linkExpirationDays: linkExpDays,
        optOutFooter: optOutFooter,
      });
      toast.success("Delivery settings saved");
    } catch {
      toast.error("Failed to save delivery settings");
    }
  };

  const saveMfaSettings = async () => {
    setMfaSaving(true);
    try {
      await updateMfaSettings({ required: mfaRequired });
      toast.success("Security settings saved");
    } catch {
      toast.error("Failed to save security settings");
    } finally {
      setMfaSaving(false);
    }
  };

  const handlePublish = async (folderId: string) => {
    await publishFolder(folderId);
    toast.success("Folder published to team");
    loadFolders();
  };

  const handleUnpublish = async (folderId: string) => {
    await unpublishFolder(folderId);
    toast.success("Folder unpublished");
    loadFolders();
  };

  const personalFolders = allFolders.filter((f) => f.type === "personal" && !f.isPublished);
  const teamFolders = allFolders.filter((f) => f.type === "team" || f.isPublished);

  return (
    <>
      <Header title="Organization Settings" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Message Templates */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Message Templates</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Customize the outbound SMS and email copy. Supported tokens:{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">[Organization Name]</code> and{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">[link]</code>.
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tpl-sms">SMS Template</Label>
                <Input id="tpl-sms" value={sms} onChange={(e) => setSms(e.target.value)} className="mt-1 font-mono text-sm" />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default: <span className="font-mono">[Organization Name] has sent you a message: [link]</span>
                </p>
              </div>
              <div>
                <Label htmlFor="tpl-email-subject">Email Subject</Label>
                <Input id="tpl-email-subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="mt-1 font-mono text-sm" />
              </div>
              <div>
                <Label htmlFor="tpl-email-body">Email Body</Label>
                <textarea id="tpl-email-body" value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={4} className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Button onClick={saveTemplates} size="sm">Save Templates</Button>
            </div>
          </section>

          {/* Delivery Settings */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Delivery Settings</h2>
            <p className="mb-6 text-sm text-muted-foreground">Configure how messages are delivered and when links expire.</p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="link-exp-days">Link Expiration (days of inactivity)</Label>
                <Input id="link-exp-days" type="number" min={1} max={365} value={linkExpDays} onChange={(e) => setLinkExpDays(Number(e.target.value))} className="mt-1 max-w-[200px]" />
                <p className="mt-1 text-xs text-muted-foreground">Patient links expire after this many days of inactivity. Default: 30.</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="opt-out-footer" checked={optOutFooter} onChange={(e) => setOptOutFooter(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                <Label htmlFor="opt-out-footer" className="text-sm">Include opt-out link in messages</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, SMS messages include &quot;Reply STOP to opt-out&quot; and emails include an unsubscribe footer.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Button onClick={saveDelivery} size="sm">Save Delivery Settings</Button>
            </div>
          </section>

          {/* Security Settings */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Security Settings</h2>
            <p className="mb-6 text-sm text-muted-foreground">Configure authentication and security requirements for your organization.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="mfa-required"
                  checked={mfaRequired}
                  onChange={(e) => setMfaRequired(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="mfa-required" className="text-sm">Require Two-Factor Authentication</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, all users in your organization must verify a 6-digit code sent to their email each time they sign in. Users cannot disable MFA while this setting is active.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Button onClick={saveMfaSettings} size="sm" disabled={mfaSaving}>
                {mfaSaving ? "Saving..." : "Save Security Settings"}
              </Button>
            </div>
          </section>

          {/* Team Folder Management */}
          <section className="rounded-lg border bg-white p-6">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Team Folder Management</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Publish personal folders to make them visible to all users in your organization.
            </p>
            <div className="mb-6">
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Published Team Folders</h3>
              {teamFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team folders yet.</p>
              ) : (
                <div className="space-y-2">
                  {teamFolders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.name}</span>
                        <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Team</Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleUnpublish(f.id)}>Unpublish</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-muted-foreground">Personal Folders (can be published)</h3>
              {personalFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground">All personal folders are already published, or none exist.</p>
              ) : (
                <div className="space-y-2">
                  {personalFolders.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.name}</span>
                        <Badge variant="outline">Personal</Badge>
                      </div>
                      <Button variant="ghost" size="sm" className="text-teal-700 hover:text-teal-700" onClick={() => handlePublish(f.id)}>Publish to Team</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
