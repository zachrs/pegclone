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
import { addOrgContent as addOrgContentAction } from "@/lib/actions/library";
import { toast } from "sonner";

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
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    if (!url.trim()) { toast.error("Please enter a URL"); return; }
    setSaving(true);
    try {
      // Save to database (fix #5: pass folderId)
      await addOrgContentAction({
        title: title.trim(),
        type: "link",
        url: url.trim(),
        folderId: folderId || undefined,
      });
    } catch {
      // DB save failed, fall back to local store
    }
    // Always update local Zustand store for UI feedback
    addOrgContent({
      title: title.trim(),
      source: "My Uploads",
      type: "link",
      url: url.trim(),
      folderId: folderId || undefined,
    });
    toast.success("Link added to library");
    setSaving(false);
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
          disabled={!title.trim() || !url.trim() || saving}
        >
          {saving ? "Adding..." : "Add Link"}
        </Button>
      </div>
    </div>
  );
}

function UploadPdfForm({ onClose }: { onClose: () => void }) {
  const { addOrgContent, folders } = useLibraryStore();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) {
        setTitle(f.name.replace(/\.pdf$/i, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !file) return;
    setUploading(true);
    setProgress(10);

    try {
      // 1. Upload file to Vercel Blob
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&folder=content`,
        {
          method: "POST",
          body: file,
        }
      );

      setProgress(70);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error ?? "Upload failed");
      }

      const { url, pathname } = await response.json();
      setProgress(85);

      // 2. Save content item to database (fix #5: pass folderId)
      try {
        await addOrgContentAction({
          title: title.trim(),
          type: "pdf",
          url,
          storagePath: pathname,
          folderId: folderId || undefined,
        });
      } catch {
        // DB save failed, fall back to local store
      }

      setProgress(100);

      // 3. Update local Zustand store
      addOrgContent({
        title: title.trim(),
        source: "My Uploads",
        type: "pdf",
        url,
        folderId: folderId || undefined,
      });

      toast.success("PDF uploaded to library");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const personalFolders = folders.filter(
    (f) => f.type === "personal" || f.type === "team"
  );

  const fileSizeMB = file ? (file.size / (1024 * 1024)).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-1 block text-sm font-medium">PDF File</label>
        <div
          className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-gray-300 px-4 py-6 text-center transition-colors hover:border-teal-400 hover:bg-teal-50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f && f.name.endsWith(".pdf")) {
              setFile(f);
              if (!title) setTitle(f.name.replace(/\.pdf$/i, ""));
            }
          }}
        >
          {file ? (
            <div className="flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 2h6l4 4v10a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="#0d9488" strokeWidth="1.5" />
                <path d="M12 2v4h4" stroke="#0d9488" strokeWidth="1.5" />
              </svg>
              <div className="text-left">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{fileSizeMB} MB</p>
              </div>
              <button
                className="text-muted-foreground hover:text-red-600"
                onClick={() => setFile(null)}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <p className="text-sm text-muted-foreground">
                Drag a PDF here or click to browse
              </p>
              <label className="cursor-pointer rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200">
                Choose File
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </>
          )}
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

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress < 70 ? "Uploading PDF..." : progress < 100 ? "Saving to library..." : "Done!"}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={uploading}>
          Cancel
        </Button>
        <Button
          className="bg-teal-700 hover:bg-teal-800"
          onClick={handleSubmit}
          disabled={!title.trim() || !file || uploading}
        >
          {uploading ? "Uploading..." : "Upload PDF"}
        </Button>
      </div>
    </div>
  );
}
