"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Recipient } from "@/lib/hooks/use-recipients-store";

interface RecipientTableProps {
  recipients: Recipient[];
  onViewRecipient: (recipient: Recipient) => void;
}

export function RecipientTable({ recipients, onViewRecipient }: RecipientTableProps) {
  if (recipients.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No recipients found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Messaged</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((recipient) => (
            <TableRow key={recipient.id}>
              <TableCell className="font-medium">
                {recipient.firstName} {recipient.lastName}
              </TableCell>
              <TableCell className="font-mono text-sm">
                {recipient.contact}
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {recipient.lastMessagedAt
                  ? new Date(recipient.lastMessagedAt).toLocaleDateString()
                  : "Never"}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-purple-700 hover:text-purple-900"
                  onClick={() => onViewRecipient(recipient)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
