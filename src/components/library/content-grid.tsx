"use client";

import { ContentCard } from "./content-card";
import type { CartItem } from "@/lib/hooks/use-send-cart";

interface ContentGridItem {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  isFavorite?: boolean;
}

interface ContentGridProps {
  items: ContentGridItem[];
  onSendSingle?: (item: CartItem) => void;
  emptyMessage?: string;
}

export function ContentGrid({ items, onSendSingle, emptyMessage }: ContentGridProps) {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ContentCard
          key={item.id}
          id={item.id}
          title={item.title}
          source={item.source}
          type={item.type}
          url={item.url}
          isFavorite={item.isFavorite}
          onSendSingle={onSendSingle}
        />
      ))}
    </div>
  );
}
