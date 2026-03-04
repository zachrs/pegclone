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
import { Check, ExternalLink, Heart, FileText, PackageOpen } from "lucide-react";

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
  emptyMessage?: string;
}

export function ContentList({ items, emptyMessage }: ContentListProps) {
  const { toggleItem, hasItem } = useSendCart();
  const { toggleFavorite } = useLibraryStore();

  if (items.length === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 animate-fade-in-up">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <PackageOpen className="h-7 w-7 text-muted-foreground/60" />
        </div>
        <div className="text-center">
          <p className="font-medium text-muted-foreground">
            {emptyMessage ?? "No content found"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Try adjusting your search or browse a different category
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-md">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-8"></TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-32">Source</TableHead>
            <TableHead className="w-28">Date Added</TableHead>
            <TableHead className="w-28 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelected = hasItem(item.id);
            const cartItem: CartItem = { id: item.id, title: item.title, source: item.source, type: item.type };
            return (
              <TableRow
                key={item.id}
                onClick={() => toggleItem(cartItem)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/40",
                  isSelected && "bg-primary/5 hover:bg-primary/10"
                )}
              >
                <TableCell className="px-2">
                  <button
                    onClick={() => toggleItem(cartItem)}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input hover:border-primary/50"
                    )}
                    aria-label={isSelected ? "Deselect item" : "Select item"}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                </TableCell>
                <TableCell className="text-sm font-medium">{item.title}</TableCell>
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
                    {item.type === "pdf" ? (
                      <><FileText className="mr-1 h-3 w-3" />PDF</>
                    ) : "Link"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{item.source}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => { if (item.url) window.open(item.url, "_blank"); }}
                      aria-label="View content"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => toggleFavorite(item.id)}
                      aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart className={cn("h-3.5 w-3.5", item.isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
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
