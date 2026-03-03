"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Recipient } from "@/lib/hooks/use-recipients-store";
import { useRecipientsStore } from "@/lib/hooks/use-recipients-store";
import { useMessagesStore } from "@/lib/hooks/use-messages-store";

interface RecipientDetailPanelProps {
  recipient: Recipient;
  onClose: () => void;
}

export function RecipientDetailPanel({
  recipient,
  onClose,
}: RecipientDetailPanelProps) {
  const { toggleOptOut } = useRecipientsStore();
  const { getMessagesForRecipient } = useMessagesStore();
  const messages = getMessagesForRecipient(recipient.id);

  return (
    <div className="flex h-full flex-col border-l bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold">
          {recipient.firstName} {recipient.lastName}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Contact info */}
      <div className="border-b px-6 py-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Contact</dt>
            <dd className="font-mono">{recipient.contact}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Type</dt>
            <dd>
              <Badge
                variant="outline"
                className={
                  recipient.contactType === "email"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }
              >
                {recipient.contactType === "email" ? "Email" : "Phone"}
              </Badge>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {recipient.optedOut ? (
                <Badge variant="destructive" className="text-xs">
                  Opted Out
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700"
                >
                  Active
                </Badge>
              )}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">First contacted</dt>
            <dd>{new Date(recipient.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Last messaged</dt>
            <dd>
              {recipient.lastMessagedAt
                ? new Date(recipient.lastMessagedAt).toLocaleDateString()
                : "Never"}
            </dd>
          </div>
        </dl>

        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            className={
              recipient.optedOut
                ? "border-green-300 text-green-700"
                : "border-red-300 text-red-700"
            }
            onClick={() => toggleOptOut(recipient.id)}
          >
            {recipient.optedOut ? "Remove Opt-Out" : "Mark as Opted Out"}
          </Button>
        </div>
      </div>

      {/* Send history */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Send History
        </h3>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages sent to this recipient yet.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {msg.contentBlocks.map((b) => b.title).join(", ")}
                  </span>
                  <StatusBadge status={msg.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(msg.sentAt).toLocaleDateString()}{" "}
                    {new Date(msg.sentAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span>via {channelLabel(msg.deliveryChannel)}</span>
                  <span>by {msg.senderName}</span>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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

function channelLabel(channel: string): string {
  const labels: Record<string, string> = {
    sms: "SMS",
    email: "Email",
    qr_code: "QR Code",
    sms_and_email: "SMS + Email",
  };
  return labels[channel] ?? channel;
}
