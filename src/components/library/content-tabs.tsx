"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLibraryStore } from "@/lib/hooks/use-library-store";

export function ContentTabs() {
  const { activeTab, setActiveTab } = useLibraryStore();

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as "system" | "org")}
    >
      <TabsList>
        <TabsTrigger value="org">Your Content</TabsTrigger>
        <TabsTrigger value="system">PEG Library</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
