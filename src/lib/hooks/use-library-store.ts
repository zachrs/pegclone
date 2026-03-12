"use client";

import { create } from "zustand";
import { toggleFavorite as toggleFavoriteAction, reorderFolders as reorderFoldersAction } from "@/lib/actions/library";

/** Mock org content item for client-side demo */
export interface OrgContentItem {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
  url?: string;
  folderId?: string;
  isFavorite: boolean;
  createdAt: string;
}

/** Mock folder for client-side demo */
export interface LibraryFolder {
  id: string;
  name: string;
  type: "personal" | "team" | "favorites";
  ownerId?: string;
  icon?: string;
  shareCount?: number;
}

export type ViewMode = "grid" | "list";

interface LibraryState {
  folders: LibraryFolder[];
  orgContent: OrgContentItem[];
  favorites: Set<string>;
  activeFolder: string | null;
  searchQuery: string;
  activeTab: "system" | "org";
  viewMode: ViewMode;
  contentVersion: number;

  setActiveFolder: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: "system" | "org") => void;
  setViewMode: (mode: ViewMode) => void;
  toggleFavorite: (id: string, meta?: { title: string; type: "pdf" | "link"; url?: string; algoliaObjectId?: string }) => void;
  addFolder: (name: string, type?: "personal" | "team") => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addOrgContent: (item: Omit<OrgContentItem, "id" | "createdAt" | "isFavorite">) => void;
  deleteOrgContent: (id: string) => void;
  bumpContentVersion: () => void;
  reorderFolders: (reorderedFolders: LibraryFolder[]) => void;
}

// Folders and content are loaded from the database on mount.
// Empty initial state ensures no stale mock data is shown.

let nextId = 100;

export const useLibraryStore = create<LibraryState>((set) => ({
  folders: [],
  orgContent: [],
  favorites: new Set<string>(),
  activeFolder: null,
  searchQuery: "",
  activeTab: "org",
  contentVersion: 0,
  viewMode: (typeof window !== "undefined"
    ? (localStorage.getItem("peg-view-mode") as ViewMode) ?? "grid"
    : "grid") as ViewMode,

  setActiveFolder: (id) => set({ activeFolder: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveTab: (tab) => set({ activeTab: tab, searchQuery: "" }),
  setViewMode: (mode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("peg-view-mode", mode);
    }
    set({ viewMode: mode });
  },

  toggleFavorite: (id, meta) => {
    // Optimistic update — track both id and algoliaObjectId so system
    // library items stay marked as favorited even if the resolved DB id
    // differs from the Algolia object id returned by search.
    const toggleSet = (favorites: Set<string>, adding: boolean) => {
      const next = new Set(favorites);
      if (adding) {
        next.add(id);
        if (meta?.algoliaObjectId && meta.algoliaObjectId !== id) next.add(meta.algoliaObjectId);
      } else {
        next.delete(id);
        if (meta?.algoliaObjectId) next.delete(meta.algoliaObjectId);
      }
      return next;
    };

    set((state) => {
      const removing = state.favorites.has(id) || (meta?.algoliaObjectId ? state.favorites.has(meta.algoliaObjectId) : false);
      return {
        favorites: toggleSet(state.favorites, !removing),
        orgContent: state.orgContent.map((c) =>
          c.id === id ? { ...c, isFavorite: !removing } : c
        ),
      };
    });
    // Persist to DB (fire-and-forget with rollback on error)
    toggleFavoriteAction(id, meta).catch((err) => {
      console.error("[library] toggleFavorite failed:", err);
      // Rollback on failure
      set((state) => {
        const isFav = state.favorites.has(id) || (meta?.algoliaObjectId ? state.favorites.has(meta.algoliaObjectId) : false);
        return {
          favorites: toggleSet(state.favorites, !isFav),
          orgContent: state.orgContent.map((c) =>
            c.id === id ? { ...c, isFavorite: !isFav } : c
          ),
        };
      });
    });
  },

  addFolder: (name, type = "personal") =>
    set((state) => ({
      folders: [
        ...state.folders,
        { id: `folder-${nextId++}`, name, type },
      ],
    })),

  renameFolder: (id, name) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    })),

  deleteFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      activeFolder: state.activeFolder === id ? null : state.activeFolder,
    })),

  addOrgContent: (item) =>
    set((state) => ({
      contentVersion: state.contentVersion + 1,
      orgContent: [
        ...state.orgContent,
        {
          ...item,
          id: `org-${nextId++}`,
          isFavorite: false,
          createdAt: new Date().toISOString().slice(0, 10),
        },
      ],
    })),

  bumpContentVersion: () =>
    set((state) => ({ contentVersion: state.contentVersion + 1 })),

  deleteOrgContent: (id) =>
    set((state) => ({
      orgContent: state.orgContent.filter((c) => c.id !== id),
    })),

  reorderFolders: (reorderedFolders) => {
    set({ folders: reorderedFolders });
    reorderFoldersAction(reorderedFolders.map((f) => f.id)).catch(() => {});
  },
}));
