"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { ContentSearchBar } from "@/components/library/content-search-bar";
import { ContentTabs } from "@/components/library/content-tabs";
import { ContentGrid } from "@/components/library/content-grid";
import { ContentList } from "@/components/library/content-list";
import { FolderSidebar } from "@/components/library/folder-sidebar";
import { SendCartBar } from "@/components/library/send-cart-bar";
import { AddContentDialog } from "@/components/library/add-content-dialog";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { useSendCart, type CartItem } from "@/lib/hooks/use-send-cart";
import { getOrgContent, getSystemContent, getFolders, getFolderItems } from "@/lib/actions/library";

export default function LibraryPage() {
  const {
    activeFolder,
    searchQuery,
    activeTab,
    viewMode,
    setViewMode,
  } = useLibraryStore();
  const { addItem } = useSendCart();
  const [sendDialogItem, setSendDialogItem] = useState<CartItem | null>(null);

  // DB-backed state
  const [orgContent, setOrgContent] = useState<Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null }>>([]);
  const [systemContent, setSystemContent] = useState<Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null }>>([]);
  const [folders, setFolders] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [folderItemIds, setFolderItemIds] = useState<Set<string>>(new Set());

  // Load org content
  useEffect(() => {
    getOrgContent()
      .then((data) => setOrgContent(data as Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null }>))
      .catch(() => {});
  }, []);

  // Load folders
  useEffect(() => {
    getFolders()
      .then((data) => {
        setFolders(data as Array<{ id: string; name: string; type: string }>);
        // Also update the Zustand store so FolderSidebar has the data
        const store = useLibraryStore.getState();
        // Sync folders to store for FolderSidebar
        useLibraryStore.setState({
          folders: data.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type as "personal" | "team" | "favorites",
          })),
        });
      })
      .catch(() => {});
  }, []);

  // Load system content based on search query
  useEffect(() => {
    if (activeTab === "org" || !searchQuery) {
      setSystemContent([]);
      return;
    }
    const timer = setTimeout(() => {
      getSystemContent(searchQuery)
        .then((data) => setSystemContent(data as Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null }>))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Load folder items when a folder is selected
  useEffect(() => {
    if (!activeFolder || activeFolder === "favorites") {
      setFolderItemIds(new Set());
      return;
    }
    getFolderItems(activeFolder)
      .then((items) => {
        setFolderItemIds(new Set(items.map((i) => i.contentItemId)));
      })
      .catch(() => {});
  }, [activeFolder]);

  // Filter org content
  const filteredOrgContent = useMemo(() => {
    if (activeTab === "system") return [];
    let items = orgContent;

    // Filter by folder
    if (activeFolder && activeFolder !== "favorites" && folderItemIds.size > 0) {
      items = items.filter((item) => folderItemIds.has(item.id));
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.source?.toLowerCase().includes(q) ?? false)
      );
    }

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source ?? "org_upload",
      type: item.type,
      url: item.url ?? undefined,
      isFavorite: false,
    }));
  }, [orgContent, activeFolder, searchQuery, activeTab, folderItemIds]);

  const filteredSystemContent = useMemo(() => {
    if (activeTab === "org") return [];
    return systemContent.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source ?? "system_library",
      type: item.type as "pdf" | "link",
      url: item.url ?? undefined,
      isFavorite: false,
    }));
  }, [systemContent, activeTab]);

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
        <aside className="hidden border-r bg-card p-4 md:block">
          <FolderSidebar />
        </aside>

        <div className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1"><ContentSearchBar /></div>
            <SendCartBar />
          </div>

          <div className="flex items-center justify-between">
            <ContentTabs />
            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <div className="flex items-center rounded-lg border bg-gray-50 p-0.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "grid" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1" y="1" width="5.5" height="5.5" rx="1" />
                    <rect x="9.5" y="1" width="5.5" height="5.5" rx="1" />
                    <rect x="1" y="9.5" width="5.5" height="5.5" rx="1" />
                    <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md p-1.5 transition-colors ${viewMode === "list" ? "bg-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  aria-label="List view"
                  title="List view"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="1" y1="3" x2="15" y2="3" />
                    <line x1="1" y1="8" x2="15" y2="8" />
                    <line x1="1" y1="13" x2="15" y2="13" />
                  </svg>
                </button>
              </div>
              <AddContentDialog />
            </div>
          </div>

          {activeFolderObj && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-teal-700">Viewing: {activeFolderObj.name}</span>
              <button className="text-xs text-muted-foreground underline" onClick={() => useLibraryStore.getState().setActiveFolder(null)}>Clear</button>
            </div>
          )}

          {(activeTab === "all" || activeTab === "org") && filteredOrgContent.length > 0 && (
            <section>
              {activeTab === "all" && <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Content</h2>}
              {viewMode === "grid" ? (
                <ContentGrid items={filteredOrgContent} onSendSingle={handleSendSingle} />
              ) : (
                <ContentList items={filteredOrgContent} onSendSingle={handleSendSingle} />
              )}
            </section>
          )}

          {(activeTab === "all" || activeTab === "system") && filteredSystemContent.length > 0 && (
            <section>
              {activeTab === "all" && <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">PEG Library</h2>}
              {viewMode === "grid" ? (
                <ContentGrid items={filteredSystemContent} onSendSingle={handleSendSingle} />
              ) : (
                <ContentList items={filteredSystemContent} onSendSingle={handleSendSingle} />
              )}
            </section>
          )}

          {filteredOrgContent.length === 0 && filteredSystemContent.length === 0 && (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
                <path d="M20 17.58A5 5 0 0018 8h-1.26A8 8 0 104 16.25" />
                <path d="M8 16h.01M8 12h.01M12 12h.01M12 16h.01M16 16h.01" />
              </svg>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? `No results for "${searchQuery}"` : "No content in this folder"}
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
