import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import path from "path";
import { apiSuccess, apiError } from "@/lib/utils/api";

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
 * Returns: { success: true, data: { url, pathname } }
 */
export async function POST(request: NextRequest) {
  // Auth check
  const session = await auth();
  if (!session?.user) {
    return apiError("Unauthorized", 401);
  }

  // Issue #3: Block uploads while MFA is pending
  if (session.user.mfaPending) {
    return apiError("MFA verification required", 403);
  }

  const searchParams = request.nextUrl.searchParams;
  const filename = searchParams.get("filename");
  const folder = searchParams.get("folder") ?? "uploads";

  if (!filename) {
    return apiError("Missing filename query parameter");
  }

  // Issue #8: Sanitize filename to prevent path traversal
  const safeName = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!safeName || safeName.startsWith(".")) {
    return apiError("Invalid filename");
  }

  // Validate file type by extension
  const ext = safeName.split(".").pop()?.toLowerCase();
  const allowedTypes = Object.keys(MIME_WHITELIST);
  if (!ext || !allowedTypes.includes(ext)) {
    return apiError(`File type .${ext} not allowed. Allowed: ${allowedTypes.join(", ")}`);
  }

  // Read body into buffer so it can be retried if needed
  const bodyBytes = await request.arrayBuffer();
  if (!bodyBytes || bodyBytes.byteLength === 0) {
    return apiError("No file body");
  }

  // Issue #8: Enforce file size limit
  if (bodyBytes.byteLength > MAX_FILE_SIZE) {
    return apiError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
  }

  const tenantId = session.user.tenantId;
  const storagePath = `${tenantId}/${folder}/${Date.now()}-${safeName}`;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("[upload] BLOB_READ_WRITE_TOKEN not found in env");
    return apiError("Blob storage not configured. BLOB_READ_WRITE_TOKEN is missing.", 500);
  }

  try {
    // HIPAA: Always use private access. Files are served via the
    // authenticated /api/viewer/pdf proxy, never directly.
    const blob = await put(storagePath, bodyBytes, {
      access: "private",
      addRandomSuffix: false,
      token,
    });

    return apiSuccess({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload] Failed:", message);
    return apiError("Upload failed. Please try again.", 500);
  }
}
