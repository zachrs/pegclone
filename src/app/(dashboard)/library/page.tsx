"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { ContentSearchBar } from "@/components/library/content-search-bar";
import { ContentTabs } from "@/components/library/content-tabs";
import { ContentGrid } from "@/components/library/content-grid";
import { FolderSidebar } from "@/components/library/folder-sidebar";
import { SendCartBar } from "@/components/library/send-cart-bar";
import { AddContentDialog } from "@/components/library/add-content-dialog";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { MOCK_SYSTEM_LIBRARY } from "@/lib/algolia/mock-data";

export default function LibraryPage() {
  const {
    orgContent,
    folders,
    favorites,
    activeFolder,
    searchQuery,
    activeTab,
  } = useLibraryStore();
  const { addItem } = useSendCart();
  const [sendDialogItem, setSendDialogItem] = useState<CartItem | null>(null);

  // Filter system library by search query
  const filteredSystemContent = useMemo(() => {
    if (!searchQuery && activeTab === "org") return [];
    const q = searchQuery.toLowerCase();
    return MOCK_SYSTEM_LIBRARY.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    ).map((item) => ({
      id: item.objectID,
      title: item.title,
      source: item.source,
      type: "link" as const,
      url: item.url,
      isFavorite: favorites.has(item.objectID),
    }));
  }, [searchQuery, activeTab, favorites]);

  // Filter org content by search query and active folder
  const filteredOrgContent = useMemo(() => {
    if (activeTab === "system") return [];
    let items = orgContent;

    // Filter by folder
    if (activeFolder === "favorites") {
      items = items.filter((item) => favorites.has(item.id));
    } else if (activeFolder) {
      items = items.filter((item) => item.folderId === activeFolder);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.source.toLowerCase().includes(q)
      );
    }

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      type: item.type,
      url: item.url,
      isFavorite: favorites.has(item.id),
    }));
  }, [orgContent, activeFolder, searchQuery, activeTab, favorites]);

  const handleSendSingle = (item: CartItem) => {
    addItem(item);
    setSendDialogItem(item);
  };

  // Get active folder name for display
  const activeFolderObj = activeFolder
    ? folders.find((f) => f.id === activeFolder)
    : null;

  return (
    <>
      <Header title="Content Library" />
      <main className="flex flex-1 overflow-hidden">
        {/* Folder sidebar */}
        <aside className="hidden border-r p-4 md:block">
          <FolderSidebar />
        </aside>

        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          {/* Top bar: search + cart */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <ContentSearchBar />
            </div>
            <SendCartBar />
          </div>

          {/* Tabs + add content */}
          <div className="flex items-center justify-between">
            <ContentTabs />
            <AddContentDialog />
          </div>

          {/* Active folder indicator */}
          {activeFolderObj && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-purple-700">
                Viewing: {activeFolderObj.name}
              </span>
              <button
                className="text-xs text-muted-foreground underline"
                onClick={() => useLibraryStore.getState().setActiveFolder(null)}
              >
                Clear
              </button>
            </div>
          )}

          {/* Content sections */}
          {(activeTab === "all" || activeTab === "org") &&
            filteredOrgContent.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Your Content
                  </h2>
                )}
                <ContentGrid
                  items={filteredOrgContent}
                  onSendSingle={handleSendSingle}
                />
              </section>
            )}

          {(activeTab === "all" || activeTab === "system") &&
            filteredSystemContent.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    PEG Library
                  </h2>
                )}
                <ContentGrid
                  items={filteredSystemContent}
                  onSendSingle={handleSendSingle}
                />
              </section>
            )}

          {filteredOrgContent.length === 0 &&
            filteredSystemContent.length === 0 && (
              <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : "No content in this folder"}
                </p>
              </div>
            )}
        </div>
      </main>
    </>
  );
}
