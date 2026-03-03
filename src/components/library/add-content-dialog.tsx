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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLibraryStore } from "@/lib/hooks/use-library-store";

type Mode = "link" | "pdf";

export function AddContentDialog() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("link");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-teal-300 text-teal-700 hover:bg-teal-50"
        >
          <span className="text-lg leading-none">+</span>
          Add Content
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Content</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "link" ? "default" : "outline"}
            size="sm"
            className={
              mode === "link"
                ? "bg-teal-700 hover:bg-teal-800"
                : "text-teal-700"
            }
            onClick={() => setMode("link")}
          >
            Add Link
          </Button>
          <Button
            variant={mode === "pdf" ? "default" : "outline"}
            size="sm"
            className={
              mode === "pdf"
                ? "bg-teal-700 hover:bg-teal-800"
                : "text-teal-700"
            }
            onClick={() => setMode("pdf")}
          >
            Upload PDF
          </Button>
        </div>

        {mode === "link" ? (
          <AddLinkForm onClose={() => setOpen(false)} />
        ) : (
          <UploadPdfForm onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddLinkForm({ onClose }: { onClose: () => void }) {
  const { addOrgContent, folders } = useLibraryStore();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [folderId, setFolderId] = useState<string>("");

  const handleSubmit = () => {
    if (!title.trim() || !url.trim()) return;
    addOrgContent({
      title: title.trim(),
      source: "My Uploads",
      type: "link",
      url: url.trim(),
      folderId: folderId || undefined,
    });
    onClose();
  };

  const personalFolders = folders.filter(
    (f) => f.type === "personal" || f.type === "team"
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input
          placeholder="e.g. Diabetes Management Guide"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">URL</label>
        <Input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Folder (optional)
        </label>
        <Select value={folderId} onValueChange={setFolderId}>
          <SelectTrigger>
            <SelectValue placeholder="No folder" />
          </SelectTrigger>
          <SelectContent>
            {personalFolders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="bg-teal-700 hover:bg-teal-800"
          onClick={handleSubmit}
          disabled={!title.trim() || !url.trim()}
        >
          Add Link
        </Button>
      </div>
    </div>
  );
}

function UploadPdfForm({ onClose }: { onClose: () => void }) {
  const { addOrgContent, folders } = useLibraryStore();
  const [title, setTitle] = useState("");
  const [fileName, setFileName] = useState("");
  const [folderId, setFolderId] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (!title) {
        setTitle(file.name.replace(/\.pdf$/i, ""));
      }
    }
  };

  const handleSubmit = () => {
    if (!title.trim() || !fileName) return;
    // In a real app, this would upload to GCS and create a content item via API
    addOrgContent({
      title: title.trim(),
      source: "My Uploads",
      type: "pdf",
      folderId: folderId || undefined,
    });
    onClose();
  };

  const personalFolders = folders.filter(
    (f) => f.type === "personal" || f.type === "team"
  );

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">PDF File</label>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-muted-foreground hover:border-teal-400 hover:bg-teal-50 flex-1 text-center">
            {fileName || "Click to select a PDF file"}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Input
          placeholder="e.g. Post-Op Care Instructions"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Folder (optional)
        </label>
        <Select value={folderId} onValueChange={setFolderId}>
          <SelectTrigger>
            <SelectValue placeholder="No folder" />
          </SelectTrigger>
          <SelectContent>
            {personalFolders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          className="bg-teal-700 hover:bg-teal-800"
          onClick={handleSubmit}
          disabled={!title.trim() || !fileName}
        >
          Upload PDF
        </Button>
      </div>
    </div>
  );
}
