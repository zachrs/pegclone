"use client";

import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/layout/header";
import { ContentSearchBar } from "@/components/library/content-search-bar";
import { ContentGrid } from "@/components/library/content-grid";
import { ContentList } from "@/components/library/content-list";
import { FolderSidebar } from "@/components/library/folder-sidebar";
import { SendCartBar } from "@/components/library/send-cart-bar";
import { AddContentDialog } from "@/components/library/add-content-dialog";
import { useLibraryStore } from "@/lib/hooks/use-library-store";
import { useSendCart } from "@/lib/hooks/use-send-cart";
import { getOrgContent, getSystemContent, getFolders, getFolderItems, getFavoriteIds, getFavoritedContent } from "@/lib/actions/library";
import { getOrgInfo } from "@/lib/actions/auth";

export default function LibraryPage() {
  const {
    activeFolder,
    searchQuery,
    activeTab,
    viewMode,
    setViewMode,
    favorites,
    contentVersion,
  } = useLibraryStore();

  const cartItemCount = useSendCart((s) => s.items.length);

  // DB-backed state
  const [orgContent, setOrgContent] = useState<Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null; createdAt: Date; uploadedBy: string | null }>>([]);
  const [systemContent, setSystemContent] = useState<Array<{ id: string; title: string; source: string; sourceName?: string; type: "pdf" | "link"; url: string | null; createdAt: Date }>>([]);
  const [favoritedContent, setFavoritedContent] = useState<Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null; algoliaObjectId: string | null; createdAt: Date }>>([]);
  const [folders, setFolders] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [folderItemIds, setFolderItemIds] = useState<Set<string>>(new Set());
  const [orgName, setOrgName] = useState("Your Organization");
  const [loading, setLoading] = useState(true);

  const favoriteIds = favorites;

  // Load org name on mount
  useEffect(() => {
    getOrgInfo()
      .then((info) => setOrgName(info.name))
      .catch(() => {});
  }, []);

  // Load favorites from DB on mount
  useEffect(() => {
    getFavoriteIds()
      .then((ids) => {
        useLibraryStore.setState({ favorites: new Set(ids) });
      })
      .catch(() => {});
  }, []);

  // Load org content (refetch when contentVersion changes)
  useEffect(() => {
    getOrgContent()
      .then((data) => setOrgContent(data as Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null; createdAt: Date; uploadedBy: string | null }>))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contentVersion]);

  // Load favorited content (for My Materials view - includes system library favorites)
  useEffect(() => {
    getFavoritedContent()
      .then((data) => setFavoritedContent(data as Array<{ id: string; title: string; source: string; type: "pdf" | "link"; url: string | null; algoliaObjectId: string | null; createdAt: Date }>))
      .catch(() => {});
  }, [contentVersion, favorites]);

  // Load folders
  useEffect(() => {
    getFolders()
      .then((data) => {
        setFolders(data as Array<{ id: string; name: string; type: string }>);
        useLibraryStore.setState({
          folders: data.map((f) => ({
            id: f.id,
            name: f.name,
            type: f.type as "personal" | "team" | "favorites",
            ownerId: f.ownerId,
            shareCount: (f as { shareCount?: number }).shareCount ?? 0,
          })),
        });
      })
      .catch(() => {});
  }, []);

  // Load system content based on search query (only when on system tab)
  useEffect(() => {
    if (activeTab !== "system" || !searchQuery) {
      setSystemContent([]);
      return;
    }
    const timer = setTimeout(() => {
      getSystemContent(searchQuery)
        .then((data) => setSystemContent(data as Array<{ id: string; title: string; source: string; sourceName?: string; type: "pdf" | "link"; url: string | null; createdAt: Date }>))
        .catch((err) => console.error("[library] System content search failed:", err));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Load folder items when a folder is selected
  useEffect(() => {
    const folderType = activeFolder ? folders.find((f) => f.id === activeFolder)?.type : null;
    if (!activeFolder || folderType === "favorites") {
      setFolderItemIds(new Set());
      return;
    }
    getFolderItems(activeFolder)
      .then((items) => {
        setFolderItemIds(new Set(items.map((i) => i.contentItemId)));
      })
      .catch(() => {});
  }, [activeFolder]);

  // Determine if active folder is the favorites folder (by type, not hardcoded ID)
  const activeFolderType = activeFolder
    ? folders.find((f) => f.id === activeFolder)?.type
    : null;
  const isViewingFavorites = activeFolderType === "favorites";

  // Filter org content - includes uploads + favorited system items for "My Materials"
  const filteredOrgContent = useMemo(() => {
    let items = orgContent;

    // Filter by folder
    if (isViewingFavorites) {
      items = items.filter((item) => favoriteIds.has(item.id));
    } else if (activeFolder && folderItemIds.size > 0) {
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

    const mapped = items.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.uploadedBy ?? orgName,
      type: item.type,
      url: item.url ?? undefined,
      isFavorite: favoriteIds.has(item.id),
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
    }));

    // When viewing My Materials (no specific folder), also include favorited system library items
    if (!activeFolder) {
      const orgIds = new Set(mapped.map((m) => m.id));
      const favSystemItems = favoritedContent
        .filter((f) => f.source === "system_library" && !orgIds.has(f.id))
        .filter((f) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return f.title.toLowerCase().includes(q);
        })
        .map((f) => ({
          id: f.algoliaObjectId ?? f.id,
          title: f.title,
          source: "PEG Library",
          type: f.type as "pdf" | "link",
          url: f.url ?? undefined,
          isFavorite: true,
          createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : undefined,
          algoliaObjectId: f.algoliaObjectId ?? undefined,
        }));
      return [...mapped, ...favSystemItems];
    }

    // When viewing Favorites folder, also include favorited system library items
    if (isViewingFavorites) {
      const orgIds = new Set(mapped.map((m) => m.id));
      const favSystemItems = favoritedContent
        .filter((f) => f.source === "system_library" && !orgIds.has(f.id))
        .filter((f) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return f.title.toLowerCase().includes(q);
        })
        .map((f) => ({
          id: f.algoliaObjectId ?? f.id,
          title: f.title,
          source: "PEG Library",
          type: f.type as "pdf" | "link",
          url: f.url ?? undefined,
          isFavorite: true,
          createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : undefined,
          algoliaObjectId: f.algoliaObjectId ?? undefined,
        }));
      return [...mapped, ...favSystemItems];
    }

    return mapped;
  }, [orgContent, activeFolder, searchQuery, folderItemIds, favoriteIds, favoritedContent, orgName, isViewingFavorites]);

  const filteredSystemContent = useMemo(() => {
    return systemContent.map((item) => ({
      id: item.id,
      title: item.title,
      source: (item as { sourceName?: string }).sourceName ?? "PEG Library",
      type: item.type as "pdf" | "link",
      url: item.url ?? undefined,
      isFavorite: favoriteIds.has(item.id),
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : undefined,
      algoliaObjectId: (item as { algoliaObjectId?: string }).algoliaObjectId,
    }));
  }, [systemContent, favoriteIds]);

  // Get active folder name for display
  const activeFolderObj = activeFolder
    ? folders.find((f) => f.id === activeFolder)
    : null;
  const isFavoritesFolder = activeFolderObj?.type === "favorites";

  const currentItems = activeTab === "org" ? filteredOrgContent : filteredSystemContent;
  const searchPlaceholder = activeTab === "system"
    ? "Search over 40,000 patient education resources"
    : "Search your materials...";

  return (
    <>
      <Header title="Content Library" />
      <main className="flex flex-1 overflow-hidden">
        <aside className="hidden border-r bg-card p-4 md:block">
          <FolderSidebar />
        </aside>

        <div className={`flex flex-1 flex-col gap-4 overflow-auto p-6 animate-fade-in-up ${cartItemCount > 0 ? "pb-20" : ""}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {activeTab === "system" ? "PEG Library" : activeFolderObj?.name ?? "My Materials"}
            </h2>
            <div className="flex items-center gap-2">
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
              {activeTab === "org" && !activeFolder && <AddContentDialog />}
              <SendCartBar />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1"><ContentSearchBar placeholder={searchPlaceholder} /></div>
          </div>

          {activeTab === "org" && activeFolderObj && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-teal-700">Viewing: {activeFolderObj.name}</span>
              <button className="text-xs text-muted-foreground underline" onClick={() => useLibraryStore.getState().setActiveFolder(null)}>Clear</button>
            </div>
          )}

          {loading && activeTab === "org" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[160px] animate-pulse rounded-xl border bg-muted/40" />
              ))}
            </div>
          ) : currentItems.length > 0 ? (
            <section>
              {viewMode === "grid" ? (
                <ContentGrid items={currentItems} />
              ) : (
                <ContentList items={currentItems} />
              )}
            </section>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/20 animate-fade-in-up">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium text-muted-foreground">
                  {searchQuery
                    ? `No results for "${searchQuery}"`
                    : activeTab === "system"
                      ? "Search the PEG Library to find patient education resources"
                      : "No content yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground/70">
                  {searchQuery
                    ? "Try a different search term"
                    : activeTab === "system"
                      ? "Type a topic above to get started"
                      : "Upload your first content item to get started"}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
