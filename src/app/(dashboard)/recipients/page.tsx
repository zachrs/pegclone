"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getRecipients,
  getMessagesForContact,
  type RecipientSummary,
} from "@/lib/actions/recipients";
import {
  Search,
  Users,
  X,
  CircleCheck,
  CircleX,
  Eye,
  Mail,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<
    Awaited<ReturnType<typeof getMessagesForContact>>
  >([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      getRecipients(searchQuery || undefined)
        .then((data) => { setRecipients(data); setLoaded(true); })
        .catch(() => setLoaded(true));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedContact) { setContactMessages([]); return; }
    getMessagesForContact(selectedContact)
      .then(setContactMessages)
      .catch(() => {});
  }, [selectedContact]);

  return (
    <>
      <Header title="Recipients" />
      <main className="flex flex-1 overflow-hidden">
        {/* Recipient list */}
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search recipients by email or phone"
              className="pl-9"
            />
          </div>

          {recipients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {!loaded
                  ? "Loading..."
                  : searchQuery
                    ? "No recipients match your search."
                    : "No messages sent yet. Recipients appear here automatically after you send."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-20">Type</TableHead>
                    <TableHead className="w-24 text-right">Sent</TableHead>
                    <TableHead className="w-28">Last Messaged</TableHead>
                    <TableHead className="w-28">Last Opened</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow
                      key={r.contact}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${r.contact}`}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedContact === r.contact && "bg-primary/5"
                      )}
                      onClick={() => setSelectedContact(r.contact)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedContact(r.contact);
                        }
                      }}
                    >
                      <TableCell className="font-mono text-sm font-medium">
                        {r.contact}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={r.contactType === "email"
                          ? "gap-1 border-blue-200 bg-blue-50 text-blue-700"
                          : "gap-1 border-green-200 bg-green-50 text-green-700"}>
                          {r.contactType === "email" ? <><Mail className="h-3 w-3" />Email</> : <><MessageSquare className="h-3 w-3" />SMS</>}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{r.messageCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.lastMessagedAt
                          ? new Date(r.lastMessagedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.lastOpenedAt ? (
                          <span className="flex items-center gap-1.5 text-green-600">
                            <Eye className="h-3 w-3" />
                            {new Date(r.lastOpenedAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedContact && (
          <div className="w-96 shrink-0 border-l bg-card">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-mono text-sm font-semibold">{selectedContact}</h2>
              <button
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => setSelectedContact(null)}
                aria-label="Close detail panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Delivery stats for this recipient */}
            {contactMessages.length > 0 && (
              <div className="border-b px-5 py-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Delivery Stats
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-muted/30 p-2.5 text-center">
                    <p className="text-lg font-bold">{contactMessages.length}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">Total</p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-green-600">
                      {contactMessages.filter((m) => m.status === "delivered").length}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">Delivered</p>
                  </div>
                  <div className="rounded-lg bg-primary/5 p-2.5 text-center">
                    <p className="text-lg font-bold text-primary">
                      {contactMessages.filter((m) => m.openedAt).length}
                    </p>
                    <p className="text-[10px] font-medium text-muted-foreground">Opened</p>
                  </div>
                </div>
                {(() => {
                  const total = contactMessages.length;
                  const delivered = contactMessages.filter((m) => m.status === "delivered").length;
                  const opened = contactMessages.filter((m) => m.openedAt).length;
                  const failed = contactMessages.filter((m) => m.status === "failed").length;
                  const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
                  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
                  return (
                    <dl className="mt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Delivery rate</dt>
                        <dd className="font-medium">{deliveryRate}%</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Open rate</dt>
                        <dd className="font-medium">{openRate}%</dd>
                      </div>
                      {failed > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-red-600">Failed</dt>
                          <dd className="font-medium text-red-600">{failed}</dd>
                        </div>
                      )}
                    </dl>
                  );
                })()}
              </div>
            )}

            <div className="overflow-auto px-5 py-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Send History
              </h3>
              {contactMessages.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No messages found.</p>
              ) : (
                <div className="space-y-2">
                  {contactMessages.map((msg) => {
                    const blocks = msg.contentBlocks as Array<{ content_item_id: string; order: number }> | null;
                    return (
                      <div key={msg.id} className="rounded-xl border p-3 text-sm shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {blocks?.length ?? 0} content item{(blocks?.length ?? 0) !== 1 ? "s" : ""}
                          </span>
                          <MessageStatusBadge status={msg.status} opened={!!msg.openedAt} />
                        </div>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                          {msg.deliveryChannel === "email" ? (
                            <Mail className="h-3 w-3" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          <span>
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "—"}{" "}
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                          <span>via {msg.deliveryChannel === "email" ? "Email" : "SMS"}</span>
                        </div>
                        {msg.openedAt && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-600">
                            <Eye className="h-3 w-3" />
                            Opened {new Date(msg.openedAt).toLocaleDateString()}{" "}
                            {new Date(msg.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        )}
                        {msg.status === "failed" && (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                            <CircleX className="h-3 w-3" />
                            Delivery failed
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function MessageStatusBadge({ status, opened }: { status: string; opened: boolean }) {
  if (opened) return <Badge variant="outline" className="gap-1 border-green-200 bg-green-50 text-green-700"><Eye className="h-3 w-3" />Opened</Badge>;
  const styles: Record<string, string> = {
    queued: "border-yellow-200 bg-yellow-50 text-yellow-700",
    sent: "border-blue-200 bg-blue-50 text-blue-700",
    delivered: "border-amber-200 bg-amber-50 text-amber-700",
    failed: "border-red-200 bg-red-50 text-red-700",
  };
  const icons: Record<string, React.ReactNode> = {
    delivered: <CircleCheck className="h-3 w-3" />,
    failed: <CircleX className="h-3 w-3" />,
  };
  return (
    <Badge variant="outline" className={cn("gap-1", styles[status] ?? "")}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
