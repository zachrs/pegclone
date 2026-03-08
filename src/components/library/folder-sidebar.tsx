"use client";

import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLibraryStore, type LibraryFolder } from "@/lib/hooks/use-library-store";
import { createFolder, renameFolder as renameFolderAction, deleteFolder as deleteFolderAction } from "@/lib/actions/library";
import { publishFolder, unpublishFolder } from "@/lib/actions/admin";
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
} from "lucide-react";

export function FolderSidebar() {
  const { folders, activeFolder, activeTab, setActiveFolder, setActiveTab, reorderFolders } = useLibraryStore();
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIsTeam, setNewFolderIsTeam] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const favoritesFolder = folders.filter((f) => f.type === "favorites");
  const personalFolders = folders.filter((f) => f.type === "personal");
  const teamFolders = folders.filter((f) => f.type === "team");

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        const folderType = newFolderIsTeam ? "team" : "personal";
        await createFolder(newFolderName.trim(), folderType);
        useLibraryStore.getState().addFolder(newFolderName.trim(), folderType);
        setNewFolderName("");
        setNewFolderIsTeam(false);
        setDialogOpen(false);
      } catch {
        toast.error("Failed to create folder");
      }
    }
  };

  const handleReorder = useCallback(
    (type: "personal" | "team", reordered: LibraryFolder[]) => {
      // Rebuild the full folder list preserving other sections
      const others = folders.filter((f) => f.type !== type);
      // Insert the reordered section at the position of the first folder of that type
      const firstIdx = folders.findIndex((f) => f.type === type);
      if (firstIdx === -1) return;
      const result = [...others];
      result.splice(
        Math.min(firstIdx, result.length),
        0,
        ...reordered
      );
      reorderFolders(result);
    },
    [folders, reorderFolders]
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

      {/* New Folder - directly below My Materials */}
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="new-folder-team"
                checked={newFolderIsTeam}
                onChange={(e) => setNewFolderIsTeam(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="new-folder-team" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                Make this a team folder
              </label>
            </div>
            <Button onClick={handleCreateFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* My Folders section */}
      {(favoritesFolder.length > 0 || personalFolders.length > 0 || teamFolders.length > 0) && (
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
        folders={personalFolders.filter((f) => !isMyUploadsFolder(f))}
        activeFolder={activeTab === "org" ? activeFolder : null}
        onSelect={(id) => { setActiveTab("org"); setActiveFolder(id); }}
        onReorder={(reordered) => handleReorder("personal", reordered)}
      />

      {teamFolders.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
          <DraggableFolderList
            folders={teamFolders}
            activeFolder={activeTab === "org" ? activeFolder : null}
            onSelect={(id) => { setActiveTab("org"); setActiveFolder(id); }}
            onReorder={(reordered) => handleReorder("team", reordered)}
          />
        </>
      )}

    </div>
  );
}

function DraggableFolderList({
  folders,
  activeFolder,
  onSelect,
  onReorder,
}: {
  folders: LibraryFolder[];
  activeFolder: string | null;
  onSelect: (id: string) => void;
  onReorder: (folders: LibraryFolder[]) => void;
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
          />
        </div>
      ))}
    </div>
  );
}

function isMyUploadsFolder(folder: LibraryFolder) {
  return folder.id === "my-uploads" || folder.name.toLowerCase() === "my uploads" || folder.name.toLowerCase() === "my materials";
}

function getIcon(folder: LibraryFolder) {
  if (folder.type === "favorites") return Heart;
  if (isMyUploadsFolder(folder)) return Upload;
  if (folder.type === "team") return Users;
  return Folder;
}

function FolderButton({ folder, isActive, onClick, draggable = false }: { folder: LibraryFolder; isActive: boolean; onClick: () => void; draggable?: boolean }) {
  const Icon = getIcon(folder);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data: session } = useSession();

  const myUploads = isMyUploadsFolder(folder);
  const isAdmin = session?.user?.isAdmin === true;
  const isOwner = session?.user?.id === folder.ownerId;

  // Personal folders: owner can rename/delete. Team folders: admin can delete.
  const canEdit = (folder.type === "personal" && isOwner && !myUploads) || (folder.type === "team" && isAdmin);
  const canDelete = canEdit;
  const canRename = (folder.type === "personal" && isOwner && !myUploads) || (folder.type === "team" && isAdmin);
  const canToggleType = (folder.type === "personal" || folder.type === "team") && !myUploads;

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

  const handleToggleType = async () => {
    const newType = folder.type === "personal" ? "team" : "personal";
    try {
      if (newType === "team") {
        await publishFolder(folder.id);
      } else {
        await unpublishFolder(folder.id);
      }
      useLibraryStore.getState().toggleFolderType(folder.id, newType);
      toast.success(`Folder moved to ${newType === "team" ? "Team" : "Personal"}`);
    } catch {
      toast.error("Failed to update folder type");
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
      {(canRename || canDelete || canToggleType) && (
        <div className="absolute right-1 hidden gap-0.5 group-hover:flex">
          {canToggleType && isAdmin && (
            <button
              onClick={handleToggleType}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={folder.type === "personal" ? "Make team folder" : "Make personal folder"}
              title={folder.type === "personal" ? "Move to Team" : "Move to Personal"}
            >
              {folder.type === "personal" ? (
                <Users className="h-3 w-3" />
              ) : (
                <Folder className="h-3 w-3" />
              )}
            </button>
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
