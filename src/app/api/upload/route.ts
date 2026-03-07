import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import path from "path";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MIME_WHITELIST: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  svg: ["image/svg+xml"],
  webp: ["image/webp"],
  gif: ["image/gif"],
};

/**
 * POST /api/upload
 *
 * Uploads a file to Vercel Blob storage.
 * Requires authentication via NextAuth session.
 *
 * Query params:
 *   - filename: the desired filename
 *   - folder: optional subfolder (e.g. "logos", "content")
 *
 * Body: raw file bytes (send as Request body, not FormData)
 *
 * Returns: { url, pathname }
 */
export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");
  const folder = searchParams.get("folder") ?? "uploads";

  if (!filename) {
    return NextResponse.json(
      { error: "Missing filename query parameter" },
      { status: 400 }
    );
  }

  // Issue #8: Sanitize filename to prevent path traversal
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!safeName || safeName.startsWith(".")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  // Validate file type by extension
  const ext = safeName.split(".").pop()?.toLowerCase();
  const allowedTypes = Object.keys(MIME_WHITELIST);
  if (!ext || !allowedTypes.includes(ext)) {
    return NextResponse.json(
      { error: `File type .${ext} not allowed. Allowed: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Read body into buffer so it can be retried if needed
  const bodyBytes = await request.arrayBuffer();
  if (!bodyBytes || bodyBytes.byteLength === 0) {
    return NextResponse.json({ error: "No file body" }, { status: 400 });
  }

  // Issue #8: Enforce file size limit
  if (bodyBytes.byteLength > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  const tenantId = session.user.tenantId;
  const storagePath = `${tenantId}/${folder}/${Date.now()}-${safeName}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("[upload] BLOB_READ_WRITE_TOKEN not found in env");
    return NextResponse.json(
      { error: "Blob storage not configured. BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 }
    );
  }

  try {
    // HIPAA: Always use private access. Files are served via the
    // authenticated /api/viewer/pdf proxy, never directly.
    const blob = await put(storagePath, bodyBytes, {
      access: "private",
      addRandomSuffix: false,
      token,
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] Failed:", message);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}
