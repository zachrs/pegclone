import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";

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

  // Validate file type
  const ext = filename.split(".").pop()?.toLowerCase();
  const allowedTypes = ["pdf", "png", "jpg", "jpeg", "svg", "webp", "gif"];
  if (!ext || !allowedTypes.includes(ext)) {
    return NextResponse.json(
      { error: `File type .${ext} not allowed. Allowed: ${allowedTypes.join(", ")}` },
      { status: 400 }
    );
  }

  // Size check (read body)
  const body = request.body;
  if (!body) {
    return NextResponse.json({ error: "No file body" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const path = `${tenantId}/${folder}/${Date.now()}-${filename}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("[upload] BLOB_READ_WRITE_TOKEN not found in env");
    return NextResponse.json(
      { error: "Blob storage not configured. BLOB_READ_WRITE_TOKEN is missing." },
      { status: 500 }
    );
  }

  try {
    const blob = await put(path, body, {
      access: "public",
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
      { error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
