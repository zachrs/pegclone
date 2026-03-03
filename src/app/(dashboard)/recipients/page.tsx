"use client";

import { useMemo, useState } from "react";
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
import { useMessagesStore, type Message } from "@/lib/hooks/use-messages-store";

/** Aggregated view of a unique contact from send history */
interface RecipientRow {
  contact: string;
  contactType: "email" | "phone";
  totalSent: number;
  lastMessagedAt: string;
  lastOpenedAt: string | null;
}

export default function RecipientsPage() {
  const { messages } = useMessagesStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Aggregate messages by contact
  const recipients = useMemo(() => {
    const map = new Map<string, RecipientRow>();
    for (const msg of messages) {
      const existing = map.get(msg.recipientContact);
      if (existing) {
        existing.totalSent += 1;
        if (msg.sentAt > existing.lastMessagedAt) {
          existing.lastMessagedAt = msg.sentAt;
        }
        if (msg.openedAt && (!existing.lastOpenedAt || msg.openedAt > existing.lastOpenedAt)) {
          existing.lastOpenedAt = msg.openedAt;
        }
      } else {
        map.set(msg.recipientContact, {
          contact: msg.recipientContact,
          contactType: msg.recipientContact.includes("@") ? "email" : "phone",
          totalSent: 1,
          lastMessagedAt: msg.sentAt,
          lastOpenedAt: msg.openedAt,
        });
      }
    }
    // Sort by most recently messaged
    return Array.from(map.values()).sort(
      (a, b) => b.lastMessagedAt.localeCompare(a.lastMessagedAt)
    );
  }, [messages]);

  const filtered = useMemo(() => {
    if (!searchQuery) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter((r) => r.contact.toLowerCase().includes(q));
  }, [recipients, searchQuery]);

  // Messages for the selected contact
  const contactMessages = useMemo(() => {
    if (!selectedContact) return [];
    return messages
      .filter((m) => m.recipientContact === selectedContact)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }, [messages, selectedContact]);

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
            className="h-12 border-2 border-gray-200 bg-gray-50 text-base focus:border-purple-400 focus:bg-white"
          />

          {filtered.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                {recipients.length === 0
                  ? "No messages sent yet. Recipients appear here automatically after you send."
                  : "No recipients match your search."}
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
                  {filtered.map((r) => (
                    <TableRow
                      key={r.contact}
                      className={`cursor-pointer ${
                        selectedContact === r.contact ? "bg-purple-50" : ""
                      }`}
                      onClick={() => setSelectedContact(r.contact)}
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
                      <TableCell className="text-right">{r.totalSent}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.lastMessagedAt).toLocaleDateString()}
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
                {contactMessages.map((msg) => (
                  <div key={msg.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {msg.contentBlocks.map((b) => b.title).join(", ")}
                      </span>
                      <StatusBadge status={msg.status} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(msg.sentAt).toLocaleDateString()}{" "}
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
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
                ))}
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
