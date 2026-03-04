"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { Check } from "lucide-react";

export function SendCartBar() {
  const { items, clear } = useSendCart();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border bg-primary/5 px-4 py-2">
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {items.length} Selected
        </Badge>
        <Button
          size="sm"
          onClick={() => setSendDialogOpen(true)}
        >
          Send
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={clear}
        >
          Clear
        </Button>
      </div>

      <SendDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        items={items}
      />
    </>
  );
}

function SendDialog({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartItem[];
}) {
  const { clear } = useSendCart();
  const [contact, setContact] = useState("");

  const handleSend = () => {
    alert(
      `Sending ${items.length} item(s) to ${contact || "(no recipient entered)"}`
    );
    clear();
    setContact("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Send Materials</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Keep Adding
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              Send
            </Button>
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Email or Mobile Phone (U.S. Only):
            </label>
            <Input
              placeholder="example@email.com, 888-555-5555"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-center text-sm">
              The following item(s) will be sent to the recipient(s):
            </p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border bg-primary/5 px-3 py-1.5 text-sm"
                >
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
