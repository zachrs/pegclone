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
        const folder = await createFolder(newFolderName.trim());
        // Add to local store
        useLibraryStore.getState().addFolder(newFolderName.trim());
      } catch {
        // Fallback to local store
        useLibraryStore.getState().addFolder(newFolderName.trim());
      }
      setNewFolderName("");
      setDialogOpen(false);
    }
  };

  return (
    <div className="flex w-56 flex-col gap-1 border-r pr-4">
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-2 text-sm font-medium text-purple-700"
        onClick={() => setActiveFolder(null)}
      >
        <BrowseIcon />
        Browse All Sources
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="justify-start gap-2 text-sm font-medium text-purple-700">
            <FolderPlusIcon />
            Create New Folder
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
            <Button onClick={handleCreateFolder}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="my-2 h-px bg-border" />

      {favoritesFolder.map((folder) => (
        <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
      ))}

      {personalFolders.map((folder) => (
        <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
      ))}

      {teamFolders.length > 0 && (
        <>
          <div className="my-2 h-px bg-border" />
          {teamFolders.map((folder) => (
            <FolderButton key={folder.id} folder={folder} isActive={activeFolder === folder.id} onClick={() => setActiveFolder(folder.id)} />
          ))}
        </>
      )}
    </div>
  );
}

function FolderButton({ folder, isActive, onClick }: { folder: LibraryFolder; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        isActive ? "bg-purple-100 font-semibold text-purple-800" : "text-purple-700 hover:bg-purple-50"
      )}
    >
      <FolderIcon type={folder.type} />
      <span className="truncate">{folder.name}</span>
    </button>
  );
}

function FolderIcon({ type }: { type: string }) {
  if (type === "favorites") return <span className="flex h-5 w-5 items-center justify-center rounded bg-red-100 text-xs">&#10084;</span>;
  if (type === "team") return <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-[10px]">&#128101;</span>;
  return <span className="flex h-5 w-5 items-center justify-center rounded bg-orange-100 text-xs">&#128193;</span>;
}

function BrowseIcon() {
  return <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-xs">&#128218;</span>;
}

function FolderPlusIcon() {
  return <span className="flex h-5 w-5 items-center justify-center rounded bg-purple-100 text-xs">&#65291;</span>;
}
