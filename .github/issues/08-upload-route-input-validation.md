---
title: "[HIGH] Add path traversal, MIME, and size validation to upload route"
labels: security, high, bug
---

## Problem

`src/app/api/upload/route.ts` has three input validation gaps:

1. **Path traversal** (line 27): `filename` from form data is used directly in `put(filename || file.name, ...)`. A filename like `../../etc/passwd` could be exploited depending on the storage backend.
2. **Extension-only type check** (lines 38–44): Only checks file extension, not MIME type. A malicious file can be renamed to `.pdf`.
3. **No size limit** (line 27): `file` is consumed via `arrayBuffer()` internally by `put()` with no size check, risking memory exhaustion.

## Affected File

`src/app/api/upload/route.ts` — lines 27, 38–44

## Fix

```typescript
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import path from "path";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const filename = formData.get("filename") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Sanitize filename — strip path components
    const safeName = path.basename(filename || file.name).replace(/[^a-zA-Z0-9._-]/g, "_");

    // Extension check
    const allowedExtensions = [".pdf", ".mp4", ".mov", ".avi", ".webm"];
    const ext = path.extname(safeName).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed: ${allowedExtensions.join(", ")}` },
        { status: 400 }
      );
    }

    const blob = await put(safeName, file, { access: "public" });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
```

## Verification

1. Upload a file with `../../../etc/passwd` as filename → filename is sanitized to `etc_passwd`.
2. Rename a `.txt` file to `.pdf` → rejected by MIME check.
3. Upload a 200MB file → rejected with size error.
4. Normal PDF/video upload → works as before.
