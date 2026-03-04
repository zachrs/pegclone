"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  Heart,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

interface ContentCardProps {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  isFavorite?: boolean;
  algoliaObjectId?: string;
}

export function ContentCard({
  id,
  title,
  source,
  type,
  url,
  isFavorite,
  algoliaObjectId,
}: ContentCardProps) {
  const { toggleItem, hasItem } = useSendCart();
  const { toggleFavorite } = useLibraryStore();
  const isSelected = hasItem(id);
  const cartItem: CartItem = { id, title, source, type };

  return (
    <div
      onClick={() => toggleItem(cartItem)}
      className={cn(
        "group relative flex h-[160px] cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-md card-hover hover:shadow-lg hover:border-primary/20",
        isSelected && "ring-2 ring-primary ring-offset-1"
      )}
    >
      {/* Type indicator bar */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-2",
        type === "pdf" ? "bg-red-50" : "bg-blue-50"
      )}>
        {type === "pdf" ? (
          <FileText className="h-3.5 w-3.5 text-red-500" />
        ) : (
          <LinkIcon className="h-3.5 w-3.5 text-blue-500" />
        )}
        <span className="text-xs font-medium text-muted-foreground">{source}</span>
        <Badge
          variant="outline"
          className={cn(
            "ml-auto text-[10px] px-1.5 py-0",
            type === "pdf"
              ? "border-red-200 text-red-600"
              : "border-blue-200 text-blue-600"
          )}
        >
          {type === "pdf" ? "PDF" : "Link"}
        </Badge>
      </div>

      {/* Title */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <h3 className="text-sm font-semibold leading-snug text-card-foreground line-clamp-2">{title}</h3>
      </div>

      {/* Action bar */}
      <div className="flex items-center border-t px-2 py-1">
        <div
          className="flex flex-1 items-center gap-2 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleItem(cartItem)}
            aria-label={isSelected ? "Deselect item" : "Select item"}
          />
          <span className={cn("text-xs", isSelected ? "text-primary font-medium" : "text-muted-foreground")}>
            {isSelected ? "Selected" : "Select"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => { e.stopPropagation(); if (url) window.open(url, "_blank"); }}
          aria-label="View content"
        >
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={(e) => { e.stopPropagation(); toggleFavorite(id, { title, type, url, algoliaObjectId }); }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("h-3.5 w-3.5", isFavorite ? "fill-red-500 text-red-500" : "text-muted-foreground")} />
        </Button>
      </div>
    </div>
  );
}
