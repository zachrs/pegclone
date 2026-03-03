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

export default function RecipientsPage() {
  const [recipients, setRecipients] = useState<RecipientSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [contactMessages, setContactMessages] = useState<
    Awaited<ReturnType<typeof getMessagesForContact>>
  >([]);
  const [loaded, setLoaded] = useState(false);

  // Fetch recipients (debounced by search)
  useEffect(() => {
    const timer = setTimeout(() => {
      getRecipients(searchQuery || undefined)
        .then((data) => {
          setRecipients(data);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch messages for selected contact
  useEffect(() => {
    if (!selectedContact) {
      setContactMessages([]);
      return;
    }
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
          <Input
            type="search"
            placeholder="Search by email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search recipients by email or phone"
            className="h-12 border-2 border-gray-200 bg-gray-50 text-base focus:border-purple-400 focus:bg-white"
          />

          {recipients.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                {!loaded
                  ? "Loading..."
                  : searchQuery
                    ? "No recipients match your search."
                    : "No messages sent yet. Recipients appear here automatically after you send."}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Messages Sent</TableHead>
                    <TableHead>Last Messaged</TableHead>
                    <TableHead>Last Opened</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow
                      key={r.contact}
                      tabIndex={0}
                      role="button"
                      aria-label={`View details for ${r.contact}`}
                      className={`cursor-pointer ${
                        selectedContact === r.contact ? "bg-purple-50" : ""
                      }`}
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
                        <Badge
                          variant="outline"
                          className={
                            r.contactType === "email"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-green-200 bg-green-50 text-green-700"
                          }
                        >
                          {r.contactType === "email" ? "Email" : "SMS"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{r.messageCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.lastMessagedAt
                          ? new Date(r.lastMessagedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.lastOpenedAt
                          ? new Date(r.lastOpenedAt).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Detail panel — message history for selected contact */}
        {selectedContact && (
          <div className="w-96 shrink-0 border-l bg-white">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="font-mono text-sm font-semibold">
                {selectedContact}
              </h2>
              <button
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedContact(null)}
              >
                Close
              </button>
            </div>
            <div className="overflow-auto px-6 py-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Send History
              </h3>
              <div className="space-y-3">
                {contactMessages.map((msg) => {
                  const blocks = msg.contentBlocks as Array<{ content_item_id: string; order: number }> | null;
                  return (
                    <div key={msg.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {blocks?.length ?? 0} content item{(blocks?.length ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <StatusBadge status={msg.status} />
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : "—"}{" "}
                        {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : ""}{" "}
                        via {msg.deliveryChannel === "email" ? "Email" : "SMS"}
                      </div>
                      {msg.openedAt && (
                        <p className="mt-1 text-xs text-green-600">
                          Opened{" "}
                          {new Date(msg.openedAt).toLocaleDateString()}{" "}
                          {new Date(msg.openedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                      {msg.status === "failed" && (
                        <p className="mt-1 text-xs text-red-600">
                          Delivery failed
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "border-yellow-200 bg-yellow-50 text-yellow-700",
    sent: "border-blue-200 bg-blue-50 text-blue-700",
    delivered: "border-green-200 bg-green-50 text-green-700",
    failed: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
