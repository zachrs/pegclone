"use client";

import { create } from "zustand";
import { toggleFavorite as toggleFavoriteAction } from "@/lib/actions/library";

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
  icon?: string;
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
  toggleFolderType: (id: string, newType: "personal" | "team") => void;
}

const INITIAL_FOLDERS: LibraryFolder[] = [
  { id: "favorites", name: "Favorites", type: "favorites" },
  { id: "my-uploads", name: "My Materials", type: "personal" },
  { id: "team-materials", name: "My Team's Materials", type: "team" },
  { id: "speech-therapy", name: "Speech Therapy", type: "personal" },
  { id: "fpm-info", name: "FPM: AWH FPM Information", type: "team" },
  { id: "fpm-pelvic", name: "FPM: Female Pelvic Medicine", type: "team" },
  { id: "fpm-habits", name: "FPM: Healthy Habits and Education", type: "team" },
  { id: "gyn-onc", name: "Gyn/Onc: Caregiver Info & Support Resources", type: "team" },
];

const INITIAL_ORG_CONTENT: OrgContentItem[] = [
  {
    id: "org-001",
    title: "Achilles Tendonitis",
    source: "My Uploads",
    type: "link",
    url: "https://example.com/achilles",
    isFavorite: false,
    createdAt: "2025-09-15",
  },
  {
    id: "org-002",
    title: "Missed Birth Control",
    source: "My Team's Materials",
    type: "link",
    url: "https://example.com/birth-control",
    folderId: "team-materials",
    isFavorite: false,
    createdAt: "2025-08-22",
  },
  {
    id: "org-003",
    title: "Test google doc",
    source: "My Uploads",
    type: "link",
    url: "https://docs.google.com/test",
    folderId: "my-uploads",
    isFavorite: false,
    createdAt: "2025-10-01",
  },
  {
    id: "org-004",
    title: "Testlink",
    source: "My Uploads",
    type: "link",
    url: "https://example.com/test",
    folderId: "my-uploads",
    isFavorite: false,
    createdAt: "2025-10-05",
  },
  {
    id: "org-005",
    title: "InkTest2",
    source: "My Uploads",
    type: "pdf",
    folderId: "my-uploads",
    isFavorite: false,
    createdAt: "2025-10-10",
  },
  {
    id: "org-006",
    title: "Post-Op Knee Exercises",
    source: "My Uploads",
    type: "pdf",
    folderId: "my-uploads",
    isFavorite: true,
    createdAt: "2025-07-14",
  },
];

let nextId = 100;

export const useLibraryStore = create<LibraryState>((set) => ({
  folders: INITIAL_FOLDERS,
  orgContent: INITIAL_ORG_CONTENT,
  favorites: new Set(
    INITIAL_ORG_CONTENT.filter((c) => c.isFavorite).map((c) => c.id)
  ),
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
    // Optimistic update
    set((state) => {
      const newFavorites = new Set(state.favorites);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return {
        favorites: newFavorites,
        orgContent: state.orgContent.map((c) =>
          c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
        ),
      };
    });
    // Persist to DB (fire-and-forget with rollback on error)
    toggleFavoriteAction(id, meta).catch(() => {
      // Rollback on failure
      set((state) => {
        const newFavorites = new Set(state.favorites);
        if (newFavorites.has(id)) {
          newFavorites.delete(id);
        } else {
          newFavorites.add(id);
        }
        return {
          favorites: newFavorites,
          orgContent: state.orgContent.map((c) =>
            c.id === id ? { ...c, isFavorite: !c.isFavorite } : c
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

  toggleFolderType: (id, newType) =>
    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, type: newType } : f
      ),
    })),
}));
