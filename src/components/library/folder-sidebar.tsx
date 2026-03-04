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
import { createFolder } from "@/lib/actions/library";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  FolderPlus,
  Heart,
  Users,
  Folder,
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
      } catch {
        useLibraryStore.getState().addFolder(newFolderName.trim());
      }
      setNewFolderName("");
      setDialogOpen(false);
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

function FolderButton({ folder, isActive, onClick }: { folder: LibraryFolder; isActive: boolean; onClick: () => void }) {
  const Icon = folder.type === "favorites" ? Heart : folder.type === "team" ? Users : Folder;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{folder.name}</span>
    </button>
  );
}
