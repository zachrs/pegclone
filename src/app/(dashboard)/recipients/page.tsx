"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { Input } from "@/components/ui/input";
import { RecipientTable } from "@/components/recipients/recipient-table";
import { RecipientDetailPanel } from "@/components/recipients/recipient-detail-panel";
import {
  useRecipientsStore,
  type Recipient,
} from "@/lib/hooks/use-recipients-store";

export default function RecipientsPage() {
  const { recipients, searchQuery, setSearchQuery } = useRecipientsStore();
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(
    null
  );

  const filteredRecipients = useMemo(() => {
    if (!searchQuery) return recipients;
    const q = searchQuery.toLowerCase();
    return recipients.filter(
      (r) =>
        r.firstName.toLowerCase().includes(q) ||
        r.lastName.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q)
    );
  }, [recipients, searchQuery]);

  return (
    <>
      <Header title="Recipients" />
      <main className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          {/* Search bar */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Search recipients by name or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 border-2 border-gray-200 bg-gray-50 text-base focus:border-purple-400 focus:bg-white"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4">
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-2xl font-bold text-purple-700">
                {recipients.length}
              </p>
              <p className="text-xs text-muted-foreground">Total Recipients</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-2xl font-bold text-green-600">
                {recipients.filter((r) => !r.optedOut).length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="rounded-lg border bg-white px-4 py-3">
              <p className="text-2xl font-bold text-red-600">
                {recipients.filter((r) => r.optedOut).length}
              </p>
              <p className="text-xs text-muted-foreground">Opted Out</p>
            </div>
          </div>

          {/* Recipient table */}
          <RecipientTable
            recipients={filteredRecipients}
            onViewRecipient={setSelectedRecipient}
          />
        </div>

        {/* Detail panel */}
        {selectedRecipient && (
          <div className="w-96 shrink-0">
            <RecipientDetailPanel
              recipient={selectedRecipient}
              onClose={() => setSelectedRecipient(null)}
            />
          </div>
        )}
      </main>
    </>
  );
}
