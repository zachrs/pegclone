"use client";

import { ContentCard } from "./content-card";
import { PackageOpen } from "lucide-react";
interface ContentGridItem {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  isFavorite?: boolean;
  algoliaObjectId?: string;
}

interface ContentGridProps {
  items: ContentGridItem[];
  emptyMessage?: string;
}

export function ContentGrid({ items, emptyMessage }: ContentGridProps) {
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item, i) => (
        <div key={item.id} className={`animate-fade-in-scale stagger-${Math.min(i + 1, 8)}`}>
          <ContentCard
            id={item.id}
            title={item.title}
            source={item.source}
            type={item.type}
            url={item.url}
            isFavorite={item.isFavorite}
            algoliaObjectId={item.algoliaObjectId}
          />
        </div>
      ))}
    </div>
  );
}
