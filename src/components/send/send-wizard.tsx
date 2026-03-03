"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import {
  useRecipientsStore,
  type Recipient,
} from "@/lib/hooks/use-recipients-store";
import {
  useMessagesStore,
  type DeliveryChannel,
  type ContentBlock,
} from "@/lib/hooks/use-messages-store";

type Step = "content" | "recipients" | "configure" | "confirm" | "done";

export function SendWizard() {
  const { items, clear } = useSendCart();
  const [step, setStep] = useState<Step>("content");
  const [contentBlocks, setContentBlocks] = useState<CartItem[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<
    Array<{ id: string; name: string; contact: string; contactType: "email" | "phone" }>
  >([]);
  const [deliveryChannel, setDeliveryChannel] =
    useState<DeliveryChannel>("email");
  const [sentCount, setSentCount] = useState(0);

  // Initialize content from cart
  if (step === "content" && items.length > 0 && contentBlocks.length === 0) {
    setContentBlocks(items);
  }

  const handleSend = () => {
    const { sendMessage } = useMessagesStore.getState();
    const { updateLastMessaged } = useRecipientsStore.getState();

    const blocks: ContentBlock[] = contentBlocks.map((item, i) => ({
      type: "content_item" as const,
      contentItemId: item.id,
      title: item.title,
      order: i + 1,
    }));

    for (const recipient of selectedRecipients) {
      sendMessage({
        recipientId: recipient.id,
        recipientName: recipient.name,
        recipientContact: recipient.contact,
        contentBlocks: blocks,
        deliveryChannel,
      });
      updateLastMessaged(recipient.id);
    }

    setSentCount(selectedRecipients.length);
    clear();
    setStep("done");
  };

  const removeContent = (id: string) => {
    setContentBlocks((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {(["content", "recipients", "configure", "confirm"] as Step[]).map(
          (s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? "bg-purple-700 text-white"
                    : stepOrder(step) > i
                      ? "bg-purple-200 text-purple-800"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`h-0.5 w-8 ${
                    stepOrder(step) > i ? "bg-purple-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          )
        )}
      </div>

      {step === "content" && (
        <ContentStep
          contentBlocks={contentBlocks}
          onRemove={removeContent}
          onNext={() => setStep("recipients")}
          hasItems={contentBlocks.length > 0}
        />
      )}

      {step === "recipients" && (
        <RecipientsStep
          selectedRecipients={selectedRecipients}
          setSelectedRecipients={setSelectedRecipients}
          onBack={() => setStep("content")}
          onNext={() => setStep("configure")}
        />
      )}

      {step === "configure" && (
        <ConfigureStep
          deliveryChannel={deliveryChannel}
          setDeliveryChannel={setDeliveryChannel}
          onBack={() => setStep("recipients")}
          onNext={() => setStep("confirm")}
        />
      )}

      {step === "confirm" && (
        <ConfirmStep
          contentBlocks={contentBlocks}
          recipients={selectedRecipients}
          deliveryChannel={deliveryChannel}
          onBack={() => setStep("configure")}
          onSend={handleSend}
        />
      )}

      {step === "done" && (
        <DoneStep
          sentCount={sentCount}
          onReset={() => {
            setContentBlocks([]);
            setSelectedRecipients([]);
            setDeliveryChannel("email");
            setSentCount(0);
            setStep("content");
          }}
        />
      )}
    </div>
  );
}

function stepOrder(step: Step): number {
  const order: Record<Step, number> = {
    content: 0,
    recipients: 1,
    configure: 2,
    confirm: 3,
    done: 4,
  };
  return order[step];
}

// ── Step 1: Review Content ────────────────────────────────────────────────

function ContentStep({
  contentBlocks,
  onRemove,
  onNext,
  hasItems,
}: {
  contentBlocks: CartItem[];
  onRemove: (id: string) => void;
  onNext: () => void;
  hasItems: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Review Selected Content</h2>
        <p className="text-sm text-muted-foreground">
          Review the materials you want to send. Go back to the library to add
          more.
        </p>
      </div>

      {!hasItems ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
          <p className="text-sm text-muted-foreground">
            No content selected. Go to the Library to select items first.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contentBlocks.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border bg-orange-50 p-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-xs font-semibold text-purple-700">
                {index + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.source}</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {item.type === "pdf" ? "PDF" : "Link"}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                onClick={() => onRemove(item.id)}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          className="bg-purple-700 hover:bg-purple-800"
          onClick={onNext}
          disabled={!hasItems}
        >
          Next: Add Recipients
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Add Recipients ────────────────────────────────────────────────

function RecipientsStep({
  selectedRecipients,
  setSelectedRecipients,
  onBack,
  onNext,
}: {
  selectedRecipients: Array<{
    id: string;
    name: string;
    contact: string;
    contactType: "email" | "phone";
  }>;
  setSelectedRecipients: React.Dispatch<
    React.SetStateAction<typeof selectedRecipients>
  >;
  onBack: () => void;
  onNext: () => void;
}) {
  const { recipients } = useRecipientsStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [manualFirstName, setManualFirstName] = useState("");
  const [manualLastName, setManualLastName] = useState("");
  const [manualContact, setManualContact] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  const filteredRecipients = searchQuery
    ? recipients.filter(
        (r) =>
          !r.optedOut &&
          (r.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.contact.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const isSelected = (id: string) =>
    selectedRecipients.some((r) => r.id === id);

  const toggleRecipient = (r: Recipient) => {
    if (isSelected(r.id)) {
      setSelectedRecipients((prev) => prev.filter((s) => s.id !== r.id));
    } else {
      setSelectedRecipients((prev) => [
        ...prev,
        {
          id: r.id,
          name: `${r.firstName} ${r.lastName}`,
          contact: r.contact,
          contactType: r.contactType,
        },
      ]);
    }
  };

  const handleAddManual = () => {
    if (!manualFirstName.trim() || !manualLastName.trim() || !manualContact.trim())
      return;

    const contactType: "email" | "phone" = manualContact.includes("@")
      ? "email"
      : "phone";
    const { getOrCreateRecipient } = useRecipientsStore.getState();
    const recipient = getOrCreateRecipient(
      manualFirstName.trim(),
      manualLastName.trim(),
      manualContact.trim(),
      contactType
    );

    if (!isSelected(recipient.id)) {
      setSelectedRecipients((prev) => [
        ...prev,
        {
          id: recipient.id,
          name: `${recipient.firstName} ${recipient.lastName}`,
          contact: recipient.contact,
          contactType: recipient.contactType,
        },
      ]);
    }

    setManualFirstName("");
    setManualLastName("");
    setManualContact("");
    setShowManualForm(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Add Recipients</h2>
        <p className="text-sm text-muted-foreground">
          Search for existing recipients or add new ones.
        </p>
      </div>

      {/* Selected recipients */}
      {selectedRecipients.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">
            Selected ({selectedRecipients.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedRecipients.map((r) => (
              <Badge
                key={r.id}
                variant="secondary"
                className="gap-1 bg-purple-100 text-purple-800"
              >
                {r.name}
                <button
                  className="ml-1 text-purple-500 hover:text-purple-800"
                  onClick={() =>
                    setSelectedRecipients((prev) =>
                      prev.filter((s) => s.id !== r.id)
                    )
                  }
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Search existing */}
      <div>
        <Input
          type="search"
          placeholder="Search existing recipients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-2 border-gray-200 bg-gray-50 focus:border-purple-400 focus:bg-white"
        />
        {filteredRecipients.length > 0 && (
          <div className="mt-2 max-h-48 overflow-auto rounded-lg border">
            {filteredRecipients.map((r) => (
              <button
                key={r.id}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  isSelected(r.id) ? "bg-purple-50" : ""
                }`}
                onClick={() => toggleRecipient(r)}
              >
                <span>
                  {r.firstName} {r.lastName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.contact}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add manually */}
      {showManualForm ? (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Add New Recipient</h3>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="First name"
              value={manualFirstName}
              onChange={(e) => setManualFirstName(e.target.value)}
            />
            <Input
              placeholder="Last name"
              value={manualLastName}
              onChange={(e) => setManualLastName(e.target.value)}
            />
          </div>
          <Input
            className="mt-3"
            placeholder="Email or phone number"
            value={manualContact}
            onChange={(e) => setManualContact(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleAddManual}>
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowManualForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="self-start border-purple-300 text-purple-700"
          onClick={() => setShowManualForm(true)}
        >
          + Add New Recipient
        </Button>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="bg-purple-700 hover:bg-purple-800"
          onClick={onNext}
          disabled={selectedRecipients.length === 0}
        >
          Next: Configure Delivery
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Configure Delivery ────────────────────────────────────────────

function ConfigureStep({
  deliveryChannel,
  setDeliveryChannel,
  onBack,
  onNext,
}: {
  deliveryChannel: DeliveryChannel;
  setDeliveryChannel: (channel: DeliveryChannel) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Configure Delivery</h2>
        <p className="text-sm text-muted-foreground">
          Choose how to deliver the materials.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">
          Delivery Channel
        </label>
        <Select
          value={deliveryChannel}
          onValueChange={(v) => setDeliveryChannel(v as DeliveryChannel)}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="sms_and_email">SMS + Email</SelectItem>
            <SelectItem value="qr_code">QR Code</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-gray-50 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Automated Reminders</p>
        <p className="mt-1">
          Up to 3 reminders will be sent every 24 hours if the recipient has
          not opened the materials. Reminders use the same delivery channel.
        </p>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="bg-purple-700 hover:bg-purple-800"
          onClick={onNext}
        >
          Next: Review & Send
        </Button>
      </div>
    </div>
  );
}

// ── Step 4: Confirm & Send ────────────────────────────────────────────────

function ConfirmStep({
  contentBlocks,
  recipients,
  deliveryChannel,
  onBack,
  onSend,
}: {
  contentBlocks: CartItem[];
  recipients: Array<{ id: string; name: string; contact: string }>;
  deliveryChannel: DeliveryChannel;
  onBack: () => void;
  onSend: () => void;
}) {
  const channelLabels: Record<DeliveryChannel, string> = {
    sms: "SMS",
    email: "Email",
    qr_code: "QR Code",
    sms_and_email: "SMS + Email",
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold">Review & Send</h2>
        <p className="text-sm text-muted-foreground">
          Confirm the details before sending.
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border p-4">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">
              Content Items ({contentBlocks.length})
            </dt>
            <dd className="mt-1">
              {contentBlocks.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-0.5">
                  <span className="text-orange-600">&#9679;</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </dd>
          </div>
          <div className="border-t pt-3">
            <dt className="font-medium text-muted-foreground">
              Recipients ({recipients.length})
            </dt>
            <dd className="mt-1">
              {recipients.map((r) => (
                <div key={r.id} className="flex items-center gap-2 py-0.5">
                  <span className="text-purple-600">&#9679;</span>
                  <span>{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({r.contact})
                  </span>
                </div>
              ))}
            </dd>
          </div>
          <div className="border-t pt-3">
            <dt className="font-medium text-muted-foreground">
              Delivery Channel
            </dt>
            <dd className="mt-1">{channelLabels[deliveryChannel]}</dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          className="bg-green-600 hover:bg-green-700"
          onClick={onSend}
        >
          Send Now
        </Button>
      </div>
    </div>
  );
}

// ── Done Step ─────────────────────────────────────────────────────────────

function DoneStep({
  sentCount,
  onReset,
}: {
  sentCount: number;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-12 text-center">
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
        <h2 className="text-2xl font-semibold">Materials Sent!</h2>
        <p className="mt-1 text-muted-foreground">
          Successfully sent to {sentCount} recipient
          {sentCount !== 1 ? "s" : ""}. Messages are being delivered.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onReset}>
          Send More
        </Button>
        <Button
          className="bg-purple-700 hover:bg-purple-800"
          onClick={() => {
            window.location.href = "/recipients";
          }}
        >
          View Recipients
        </Button>
      </div>
    </div>
  );
}
