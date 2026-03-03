"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import {
  useMessagesStore,
  type ContentBlock,
} from "@/lib/hooks/use-messages-store";

export function SendWizard() {
  const { items, clear } = useSendCart();
  const [contact, setContact] = useState("");
  const [sent, setSent] = useState(false);
  const [sentContact, setSentContact] = useState("");

  const isEmail = contact.includes("@");
  const isPhone = /^\+?\d[\d\s()-]{6,}$/.test(contact.trim());
  const isValid = contact.trim().length > 0 && (isEmail || isPhone);
  const channel = isEmail ? "email" : "sms";

  const handleSend = () => {
    if (!isValid || items.length === 0) return;

    const { sendMessage } = useMessagesStore.getState();

    const blocks: ContentBlock[] = items.map((item, i) => ({
      type: "content_item" as const,
      contentItemId: item.id,
      title: item.title,
      order: i + 1,
    }));

    sendMessage({
      recipientContact: contact.trim(),
      contentBlocks: blocks,
      deliveryChannel: channel,
    });

    setSentContact(contact.trim());
    setSent(true);
    clear();
  };

  if (sent) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M8 16l5.5 5.5L24 10"
              stroke="#16a34a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Sent!</h2>
          <p className="mt-1 text-muted-foreground">
            Materials sent to{" "}
            <span className="font-mono font-medium text-foreground">
              {sentContact}
            </span>{" "}
            via {channel === "email" ? "email" : "SMS"}.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setContact("");
              setSentContact("");
            }}
          >
            Send More
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 py-12 text-center">
        <p className="text-muted-foreground">
          No content selected. Go to the Library to select items, then press
          Send.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/library";
          }}
        >
          Go to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Selected content */}
      <div className="mb-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Sending {items.length} item{items.length !== 1 ? "s" : ""}
        </h2>
        <div className="space-y-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-md border bg-orange-50 px-3 py-2 text-sm"
            >
              <span className="flex-1 font-medium">{item.title}</span>
              <Badge variant="outline" className="text-xs">
                {item.type === "pdf" ? "PDF" : "Link"}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Contact input */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium">
          Email or Mobile Phone (U.S. Only)
        </label>
        <Input
          placeholder="example@email.com, 888-555-5555"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="h-12 border-2 border-gray-200 text-base focus:border-purple-400"
        />
        {contact.trim() && isValid && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            Will send via {isEmail ? "email" : "SMS"}
          </p>
        )}
        {contact.trim() && !isValid && (
          <p className="mt-1.5 text-xs text-red-500">
            Enter a valid email address or phone number
          </p>
        )}
      </div>

      {/* Send */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/library";
          }}
        >
          Keep Adding
        </Button>
        <Button
          className="bg-purple-700 hover:bg-purple-800"
          onClick={handleSend}
          disabled={!isValid}
        >
          Send
        </Button>
      </div>
    </div>
  );
}
