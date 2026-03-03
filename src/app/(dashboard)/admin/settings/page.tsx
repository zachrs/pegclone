"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminStore } from "@/lib/hooks/use-admin-store";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const {
    messageTemplates,
    updateMessageTemplates,
    deliverySettings,
    updateDeliverySettings,
    publishedFolderIds,
    publishFolder,
    unpublishFolder,
  } = useAdminStore();
  const { folders } = useLibraryStore();

  // Message template state
  const [sms, setSms] = useState(messageTemplates.sms);
  const [emailSubject, setEmailSubject] = useState(
    messageTemplates.emailSubject
  );
  const [emailBody, setEmailBody] = useState(messageTemplates.emailBody);

  // Delivery settings state
  const [linkExpDays, setLinkExpDays] = useState(
    deliverySettings.linkExpirationDays
  );
  const [optOutFooter, setOptOutFooter] = useState(
    deliverySettings.optOutFooter
  );

  const saveTemplates = () => {
    updateMessageTemplates({
      sms: sms.trim(),
      emailSubject: emailSubject.trim(),
      emailBody: emailBody.trim(),
    });
    toast.success("Message templates saved");
  };

  const saveDelivery = () => {
    updateDeliverySettings({
      linkExpirationDays: linkExpDays,
      optOutFooter,
    });
    toast.success("Delivery settings saved");
  };

  const personalFolders = folders.filter((f) => f.type === "personal");
  const teamFolders = folders.filter(
    (f) => f.type === "team" || publishedFolderIds.has(f.id)
  );

  return (
    <>
      <Header title="Organization Settings" />
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Message Templates */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Message Templates
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Customize the outbound SMS and email copy. Supported tokens:{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">
                [Organization Name]
              </code>{" "}
              and{" "}
              <code className="rounded bg-gray-100 px-1 text-xs">[link]</code>.
            </p>

            <div className="space-y-4">
              <div>
                <Label>SMS Template</Label>
                <Input
                  value={sms}
                  onChange={(e) => setSms(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Default:{" "}
                  <span className="font-mono">
                    [Organization Name] has sent you a message: [link]
                  </span>
                </p>
              </div>
              <div>
                <Label>Email Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>Email Body</Label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <Button onClick={saveTemplates} size="sm">
                Save Templates
              </Button>
            </div>
          </section>

          {/* Delivery Settings */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Delivery Settings
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Configure how messages are delivered and when links expire.
            </p>

            <div className="space-y-4">
              <div>
                <Label>Link Expiration (days of inactivity)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={linkExpDays}
                  onChange={(e) => setLinkExpDays(Number(e.target.value))}
                  className="mt-1 max-w-[200px]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Patient links expire after this many days of inactivity.
                  Default: 30.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="opt-out-footer"
                  checked={optOutFooter}
                  onChange={(e) => setOptOutFooter(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="opt-out-footer" className="text-sm">
                  Include opt-out link in messages
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                When enabled, SMS messages include &quot;Reply STOP to
                opt-out&quot; and emails include an unsubscribe footer.
              </p>
            </div>

            <div className="mt-4 flex items-center justify-end">
              <Button onClick={saveDelivery} size="sm">
                Save Delivery Settings
              </Button>
            </div>
          </section>

          {/* Team Folder Management */}
          <section className="rounded-lg border bg-white p-6">
            <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Team Folder Management
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Publish personal folders to make them visible to all users in your
              organization. Unpublishing a team folder hides it from non-owners.
            </p>

            {/* Currently published */}
            <div className="mb-6">
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                Published Team Folders
              </h4>
              {teamFolders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No team folders yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {teamFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{f.name}</span>
                        <Badge
                          variant="outline"
                          className="border-green-200 bg-green-50 text-green-700"
                        >
                          Team
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => unpublishFolder(f.id)}
                      >
                        Unpublish
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Personal folders that can be published */}
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                Personal Folders (can be published)
              </h4>
              {personalFolders.filter((f) => !publishedFolderIds.has(f.id))
                .length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  All personal folders are already published, or none exist.
                </p>
              ) : (
                <div className="space-y-2">
                  {personalFolders
                    .filter((f) => !publishedFolderIds.has(f.id))
                    .map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{f.name}</span>
                          <Badge variant="outline">Personal</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-600 hover:text-purple-700"
                          onClick={() => publishFolder(f.id)}
                        >
                          Publish to Team
                        </Button>
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
