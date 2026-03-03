"use client";

import { Input } from "@/components/ui/input";
import { useLibraryStore } from "@/lib/hooks/use-library-store";

export function ContentSearchBar() {
  const { searchQuery, setSearchQuery } = useLibraryStore();

  return (
    <div className="w-full">
      <Input
        type="search"
        placeholder="Search over 40,000 patient education resources"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-12 border-2 border-gray-200 bg-gray-50 text-base focus:border-purple-400 focus:bg-white"
      />
    </div>
  );
}
