"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLibraryStore, type LibraryFolder } from "@/lib/hooks/use-library-store";
import {
  createFolder,
  renameFolder as renameFolderAction,
  deleteFolder as deleteFolderAction,
  getShareableUsers,
  getFolderShares,
  shareFolderWithUsers,
  unshareFolderFromUsers,
  shareWithAllOrgUsers,
  unshareFromAllUsers,
} from "@/lib/actions/library";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FolderPlus,
  Heart,
  Users,
  Folder,
  Upload,
  BookOpen,
  GripVertical,
  Share2,
  X,
} from "lucide-react";

export function FolderSidebar() {
  const { folders, activeFolder, activeTab, setActiveFolder, setActiveTab, reorderFolders } = useLibraryStore();
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: session } = useSession();

  const favoritesFolder = folders.filter((f) => f.type === "favorites");
  const myFolders = folders.filter(
    (f) => f.type !== "favorites" && f.ownerId === session?.user?.id
  );
  const sharedWithMe = folders.filter(
    (f) => f.type !== "favorites" && f.ownerId !== session?.user?.id
  );

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder(newFolderName.trim(), "personal");
        useLibraryStore.getState().addFolder(newFolderName.trim(), "personal");
        setNewFolderName("");
        setDialogOpen(false);
      } catch {
        toast.error("Failed to create folder");
      }
    }
  };

  const handleReorder = useCallback(
    (reordered: LibraryFolder[]) => {
      // Rebuild: favorites + reordered own folders + shared-with-me (unchanged)
      reorderFolders([...favoritesFolder, ...reordered, ...sharedWithMe]);
    },
    [favoritesFolder, sharedWithMe, reorderFolders]
  );

  const isPegLibrary = activeTab === "system";
  const isMyMaterials = activeTab === "org" && !activeFolder;

  return (
    <div className="flex w-56 flex-col gap-0.5">
      {/* PEG Library */}
      <button
        onClick={() => {
          setActiveTab("system");
          setActiveFolder(null);
        }}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isPegLibrary
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <BookOpen className="h-4 w-4" />
        PEG Library
      </button>

      {/* My Materials */}
      <button
        onClick={() => {
          setActiveTab("org");
          setActiveFolder(null);
        }}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isMyMaterials
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Upload className="h-4 w-4" />
        My Materials
      </button>

      {/* New Folder */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <label htmlFor="new-folder-name" className="sr-only">Folder name</label>
            <Input
              id="new-folder-name"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Folders section */}
      {(favoritesFolder.length > 0 || myFolders.length > 0) && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            My Folders
          </p>
        </>
      )}

      {favoritesFolder.map((folder) => (
        <FolderButton key={folder.id} folder={folder} isActive={activeTab === "org" && activeFolder === folder.id} onClick={() => { setActiveTab("org"); setActiveFolder(folder.id); }} />
      ))}

      <DraggableFolderList
        folders={myFolders.filter((f) => !isMyUploadsFolder(f))}
        activeFolder={activeTab === "org" ? activeFolder : null}
        onSelect={(id) => { setActiveTab("org"); setActiveFolder(id); }}
        onReorder={handleReorder}
      />

      {/* Shared with me section */}
      {sharedWithMe.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Shared with me
          </p>
          <DraggableFolderList
            folders={sharedWithMe}
            activeFolder={activeTab === "org" ? activeFolder : null}
            onSelect={(id) => { setActiveTab("org"); setActiveFolder(id); }}
            onReorder={(reordered) => {
              reorderFolders([...favoritesFolder, ...myFolders, ...reordered]);
            }}
            shared
          />
        </>
      )}

    </div>
  );
}

// ── Draggable folder list ─────────────────────────────────────────────

function DraggableFolderList({
  folders,
  activeFolder,
  onSelect,
  onReorder,
  shared = false,
}: {
  folders: LibraryFolder[];
  activeFolder: string | null;
  onSelect: (id: string) => void;
  onReorder: (folders: LibraryFolder[]) => void;
  shared?: boolean;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragCounterRef = useRef(0);

  const handleDragStart = useCallback((e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setOverIdx(idx);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
  }, []);

  const handleDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setOverIdx(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIdx: number) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      if (dragIdx === null || dragIdx === dropIdx) {
        setDragIdx(null);
        setOverIdx(null);
        return;
      }
      const reordered = [...folders];
      const moved = reordered.splice(dragIdx, 1)[0];
      if (!moved) return;
      reordered.splice(dropIdx, 0, moved);
      onReorder(reordered);
      setDragIdx(null);
      setOverIdx(null);
    },
    [dragIdx, folders, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
    setOverIdx(null);
    dragCounterRef.current = 0;
  }, []);

  if (folders.length === 0) return null;

  return (
    <div>
      {folders.map((folder, idx) => (
        <div
          key={folder.id}
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, idx)}
          onDragEnd={handleDragEnd}
          className={cn(
            "transition-transform",
            dragIdx === idx && "opacity-50",
            overIdx === idx && dragIdx !== null && dragIdx !== idx && (
              dragIdx < idx ? "border-b-2 border-primary" : "border-t-2 border-primary"
            )
          )}
        >
          <FolderButton
            folder={folder}
            isActive={activeFolder === folder.id}
            onClick={() => onSelect(folder.id)}
            draggable
            shared={shared}
          />
        </div>
      ))}
    </div>
  );
}

// ── Share folder dialog ───────────────────────────────────────────────

interface ShareableUser {
  id: string;
  fullName: string;
  email: string;
}

interface FolderShare {
  userId: string;
  fullName: string;
  email: string;
}

function ShareFolderDialog({ folderId, folderName }: { folderId: string; folderName: string }) {
  const [open, setOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<ShareableUser[]>([]);
  const [currentShares, setCurrentShares] = useState<FolderShare[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    Promise.all([getShareableUsers(), getFolderShares(folderId)])
      .then(([users, shares]) => {
        // Exclude the current user (folder owner) from the list
        setAllUsers(users.filter((u) => u.id !== session?.user?.id));
        setCurrentShares(shares);
      })
      .catch(() => toast.error("Failed to load sharing data"))
      .finally(() => setLoading(false));
  }, [open, folderId, session?.user?.id]);

  const sharedUserIds = new Set(currentShares.map((s) => s.userId));
  const isSharedWithAll = allUsers.length > 0 && allUsers.every((u) => sharedUserIds.has(u.id));

  const filtered = allUsers.filter(
    (u) =>
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleUser = async (userId: string, shared: boolean) => {
    try {
      if (shared) {
        await unshareFolderFromUsers(folderId, [userId]);
        setCurrentShares((prev) => prev.filter((s) => s.userId !== userId));
      } else {
        await shareFolderWithUsers(folderId, [userId]);
        const user = allUsers.find((u) => u.id === userId);
        if (user) {
          setCurrentShares((prev) => [...prev, { userId, fullName: user.fullName, email: user.email }]);
        }
      }
    } catch {
      toast.error("Failed to update sharing");
    }
  };

  const handleShareAll = async () => {
    try {
      if (isSharedWithAll) {
        await unshareFromAllUsers(folderId);
        setCurrentShares([]);
        toast.success("Removed all shares");
      } else {
        await shareWithAllOrgUsers(folderId);
        setCurrentShares(allUsers.map((u) => ({ userId: u.id, fullName: u.fullName, email: u.email })));
        toast.success("Shared with all users");
      }
    } catch {
      toast.error("Failed to update sharing");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Share folder"
          title="Share folder"
        >
          <Share2 className="h-3 w-3" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share &ldquo;{folderName}&rdquo;</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Share with all toggle */}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">All organization members</span>
              </div>
              <Checkbox
                checked={isSharedWithAll}
                onCheckedChange={handleShareAll}
                aria-label="Share with all users"
              />
            </div>

            {/* Search */}
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />

            {/* User list */}
            <ScrollArea className="max-h-60">
              <div className="flex flex-col gap-1">
                {filtered.map((user) => {
                  const isShared = sharedUserIds.has(user.id);
                  return (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={isShared}
                        onCheckedChange={() => handleToggleUser(user.id, isShared)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{user.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </label>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">No users found</p>
                )}
              </div>
            </ScrollArea>

            {/* Current shares summary */}
            {currentShares.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Shared with {currentShares.length} user{currentShares.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function isMyUploadsFolder(folder: LibraryFolder) {
  return folder.id === "my-uploads" || folder.name.toLowerCase() === "my uploads" || folder.name.toLowerCase() === "my materials";
}

function getIcon(folder: LibraryFolder, shared?: boolean) {
  if (folder.type === "favorites") return Heart;
  if (isMyUploadsFolder(folder)) return Upload;
  if (shared || (folder.shareCount && folder.shareCount > 0)) return Users;
  return Folder;
}

// ── Folder button ─────────────────────────────────────────────────────

function FolderButton({ folder, isActive, onClick, draggable = false, shared = false }: { folder: LibraryFolder; isActive: boolean; onClick: () => void; draggable?: boolean; shared?: boolean }) {
  const Icon = getIcon(folder, shared);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: session } = useSession();

  const myUploads = isMyUploadsFolder(folder);
  const isAdmin = session?.user?.isAdmin === true;
  const isOwner = session?.user?.id === folder.ownerId;

  const canRename = isOwner && !myUploads && folder.type !== "favorites";
  const canDelete = (isOwner || isAdmin) && !myUploads && folder.type !== "favorites";
  const canShare = isAdmin && !myUploads && folder.type !== "favorites";

  const handleRename = async () => {
    if (editName.trim() && editName !== folder.name) {
      try {
        await renameFolderAction(folder.id, editName.trim());
        useLibraryStore.getState().renameFolder(folder.id, editName.trim());
      } catch {
        toast.error("Failed to rename folder");
      }
    }
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteFolderAction(folder.id);
      useLibraryStore.getState().deleteFolder(folder.id);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    } finally {
      setConfirmDelete(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 px-2 py-1">
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleRename(); if (e.key === "Escape") setEditing(false); }}
          onBlur={handleRename}
          className="h-7 text-xs"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="group relative flex items-center">
      {draggable && (
        <div className="absolute left-0 hidden cursor-grab items-center text-muted-foreground/50 group-hover:flex" aria-hidden="true">
          <GripVertical className="h-3 w-3" />
        </div>
      )}
      <button
        onClick={onClick}
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-lg py-2 text-left text-sm font-medium transition-colors",
          draggable ? "pl-4 pr-3" : "px-3",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {(canRename || canDelete || canShare) && (
        <div className="absolute right-1 hidden gap-0.5 group-hover:flex">
          {canShare && (
            <ShareFolderDialog folderId={folder.id} folderName={folder.name} />
          )}
          {canRename && (
            <button
              onClick={() => setEditing(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Rename folder"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          )}
          {canDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={handleDelete}
                  className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-medium text-destructive-foreground"
                  aria-label="Confirm delete"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  aria-label="Cancel delete"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleDelete}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete folder"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
