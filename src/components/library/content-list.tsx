"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContentListItem {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  isFavorite?: boolean;
  createdAt?: string;
}

interface ContentListProps {
  items: ContentListItem[];
  onSendSingle?: (item: CartItem) => void;
  emptyMessage?: string;
}

export function ContentList({ items, onSendSingle, emptyMessage }: ContentListProps) {
  const { toggleItem, hasItem } = useSendCart();
  const { toggleFavorite } = useLibraryStore();

  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? "No content found"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-32">Source</TableHead>
            <TableHead className="w-28">Date Added</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = hasItem(item.id);
            const cartItem: CartItem = { id: item.id, title: item.title, source: item.source, type: item.type };
            return (
              <TableRow
                key={item.id}
                className={cn(
                  "transition-colors",
                  isSelected && "bg-orange-50"
                )}
              >
                <TableCell className="px-2">
                  <button
                    onClick={() => toggleItem(cartItem)}
                    className="flex h-5 w-5 items-center justify-center rounded border border-gray-300 transition-colors hover:border-green-500"
                    aria-label={isSelected ? "Deselect item" : "Select item"}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3L10 3" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </TableCell>
                <TableCell className="font-medium text-sm">{item.title}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      item.type === "pdf"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-blue-200 bg-blue-50 text-blue-700"
                    )}
                  >
                    {item.type === "pdf" ? "PDF" : "Link"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.source}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        if (item.url) window.open(item.url, "_blank");
                      }}
                      aria-label="View content"
                    >
                      <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                        <circle cx="9" cy="9" r="6" stroke="#d97706" strokeWidth="1.5" />
                        <circle cx="9" cy="9" r="2.5" fill="#d97706" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleFavorite(item.id)}
                      aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                        <path
                          d="M9 15s-6-4.35-6-7.5A3.5 3.5 0 019 4.96 3.5 3.5 0 0115 7.5C15 10.65 9 15 9 15z"
                          fill={item.isFavorite ? "#dc2626" : "none"}
                          stroke="#dc2626"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => onSendSingle?.(cartItem)}
                      aria-label="Send this item"
                    >
                      <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                        <rect x="2" y="4" width="14" height="10" rx="1.5" stroke="#16a34a" strokeWidth="1.5" />
                        <path d="M2 5.5l7 4.5 7-4.5" stroke="#16a34a" strokeWidth="1.5" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
