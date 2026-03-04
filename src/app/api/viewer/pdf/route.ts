import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentItems, messages } from "@/drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

/**
 * Fix #22: PDF proxy route that verifies access token before serving files.
 * Uses storagePath (Vercel Blob URL) from content_items to proxy the PDF.
 *
 * Query params:
 *   - token: the access token from the message URL
 *   - itemId: the content item ID to serve
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const itemId = req.nextUrl.searchParams.get("itemId");

  if (!token || !itemId) {
    return NextResponse.json({ error: "Missing token or itemId" }, { status: 400 });
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
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  // Check expiration
  if (msg.accessTokenExpiresAt && msg.accessTokenExpiresAt < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 403 });
  }

  // Verify the item is part of this message's content blocks
  const blocks = (msg.contentBlocks ?? []) as Array<{ content_item_id: string }>;
  const allowedIds = blocks.map((b) => b.content_item_id);

  if (!allowedIds.includes(itemId)) {
    return NextResponse.json({ error: "Item not in message" }, { status: 403 });
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
    return NextResponse.json({ error: "Content not found" }, { status: 404 });
  }

  // Use storagePath if available (Vercel Blob URL), fall back to url
  const fileUrl = item.url || item.storagePath;
  if (!fileUrl) {
    return NextResponse.json({ error: "No file URL available" }, { status: 404 });
  }

  // Proxy the file
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
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
    return NextResponse.json({ error: "Failed to proxy file" }, { status: 502 });
  }
}
