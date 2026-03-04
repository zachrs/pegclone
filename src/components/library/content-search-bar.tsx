"use client";

import { Input } from "@/components/ui/input";
import { useLibraryStore } from "@/lib/hooks/use-library-store";

interface ContentSearchBarProps {
  placeholder?: string;
}

export function ContentSearchBar({ placeholder }: ContentSearchBarProps) {
  const { searchQuery, setSearchQuery } = useLibraryStore();

  return (
    <div className="w-full">
      <Input
        type="search"
        placeholder={placeholder ?? "Search..."}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-12 border-2 border-gray-200 bg-gray-50 text-base focus:border-teal-400 focus:bg-white"
      />
    </div>
  );
}
