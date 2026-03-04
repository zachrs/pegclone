"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BookOpen,
  FolderPlus,
  Heart,
  Users,
  Folder,
  Upload,
} from "lucide-react";

export function FolderSidebar() {
  const { folders, activeFolder, setActiveFolder } = useLibraryStore();
  const [newFolderName, setNewFolderName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const favoritesFolder = folders.filter((f) => f.type === "favorites");
  const personalFolders = folders.filter((f) => f.type === "personal");
  const teamFolders = folders.filter((f) => f.type === "team");

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder(newFolderName.trim());
        useLibraryStore.getState().addFolder(newFolderName.trim());
        setNewFolderName("");
        setDialogOpen(false);
      } catch {
        // Fix #12: Don't add phantom folder on error
        toast.error("Failed to create folder");
      }
    }
  };

  return (
    <div className="flex w-56 flex-col gap-0.5">
      <button
        onClick={() => setActiveFolder(null)}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          !activeFolder
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <BookOpen className="h-4 w-4" />
        Browse All
      </button>

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

      {(favoritesFolder.length > 0 || personalFolders.length > 0) && (
        <div className="my-2 h-px bg-border" />
      )}

      {favoritesFolder.map((folder) => (
        <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
      ))}

      {personalFolders.map((folder) => (
        <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
      ))}

      {teamFolders.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
          {teamFolders.map((folder) => (
            <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
          ))}
        </>
      )}
    </div>
  );
}

function isMyUploadsFolder(folder: LibraryFolder) {
  return folder.id === "my-uploads" || folder.name.toLowerCase() === "my uploads";
}

function getIcon(folder: LibraryFolder) {
  if (folder.type === "favorites") return Heart;
  if (isMyUploadsFolder(folder)) return Upload;
  if (folder.type === "team") return Users;
  return Folder;
}

function FolderButton({ folder, isActive, onClick }: { folder: LibraryFolder; isActive: boolean; onClick: () => void }) {
  const Icon = getIcon(folder);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);

  const myUploads = isMyUploadsFolder(folder);
  const canEdit = folder.type === "personal" && !myUploads;
  const canToggleType = folder.type === "personal" || folder.type === "team";

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
    try {
      await deleteFolderAction(folder.id);
      useLibraryStore.getState().deleteFolder(folder.id);
      toast.success("Folder deleted");
    } catch {
      toast.error("Failed to delete folder");
    }
  };

  const handleToggleType = () => {
    const newType = folder.type === "personal" ? "team" : "personal";
    useLibraryStore.getState().toggleFolderType(folder.id, newType);
    toast.success(`Folder moved to ${newType === "team" ? "Team" : "Personal"}`);
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
      <button
        onClick={onClick}
        className={cn(
          "flex flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{folder.name}</span>
      </button>
      {(canEdit || (canToggleType && !myUploads)) && (
        <div className="absolute right-1 hidden gap-0.5 group-hover:flex">
          {canToggleType && !myUploads && (
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
          {canEdit && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Rename folder"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete folder"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
