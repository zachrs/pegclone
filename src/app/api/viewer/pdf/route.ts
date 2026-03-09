import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentItems, messages } from "@/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiError } from "@/lib/utils/api";

const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50 MB limit for proxied PDFs

/**
 * Fix #22: PDF proxy route that verifies access token before serving files.
 * Uses storagePath (Vercel Blob URL) from content_items to proxy the PDF.
 *
 * Query params:
 *   - token: the access token from the message URL
 *   - itemId: the content item ID to serve
 */
export async function GET(req: NextRequest) {
  // Issue #10: Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`viewer-pdf:${ip}`, 30, 60_000)) {
    return apiError("Too many requests", 429);
  }

  const token = req.nextUrl.searchParams.get("token");
  const itemId = req.nextUrl.searchParams.get("itemId");

  if (!token || !itemId) {
    return apiError("Missing token or itemId");
  }

  // Verify access token
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [msg] = await db
    .select({
      id: messages.id,
      contentBlocks: messages.contentBlocks,
      accessTokenExpiresAt: messages.accessTokenExpiresAt,
    })
    .from(messages)
    .where(eq(messages.accessTokenHash, tokenHash))
    .limit(1);

  if (!msg) {
    return apiError("Invalid token", 403);
  }

  // Check expiration
  if (msg.accessTokenExpiresAt && msg.accessTokenExpiresAt < new Date()) {
    return apiError("Token expired", 403);
  }

  // Verify the item is part of this message's content blocks
  const blocks = (msg.contentBlocks ?? []) as Array<{ content_item_id: string }>;
  const allowedIds = blocks.map((b) => b.content_item_id);

  if (!allowedIds.includes(itemId)) {
    return apiError("Item not in message", 403);
  }

  // Get content item URL (storagePath or url)
  const [item] = await db
    .select({
      url: contentItems.url,
      storagePath: contentItems.storagePath,
      title: contentItems.title,
    })
    .from(contentItems)
    .where(eq(contentItems.id, itemId))
    .limit(1);

  if (!item) {
    return apiError("Content not found", 404);
  }

  // Prefer storagePath (Vercel Blob private URL), fall back to url
  const fileUrl = item.storagePath || item.url;
  if (!fileUrl) {
    return apiError("No file URL available", 404);
  }

  // Proxy the file
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout
    const response = await fetch(fileUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return apiError("Failed to fetch file", 502);
    }

    // Check content-length if available
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_PDF_SIZE) {
      return apiError("File too large", 413);
    }

    const contentType = response.headers.get("content-type") ?? "application/pdf";
    const body = response.body;

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(item.title)}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return apiError("Failed to proxy file", 502);
  }
}
