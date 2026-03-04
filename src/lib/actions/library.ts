"use server";

import { db } from "@/lib/db";
import { contentItems, folders, folderItems } from "@/drizzle/schema";
import { eq, and, ilike, or, desc, isNull } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";

// ── Content queries ─────────────────────────────────────────────────────

export async function getOrgContent() {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select()
    .from(contentItems)
    .where(
      and(
        tenant.eq(contentItems.tenantId),
        eq(contentItems.isActive, true),
        eq(contentItems.source, "org_upload")
      )
    )
    .orderBy(desc(contentItems.createdAt));
}

export async function getSystemContent(query: string) {
  if (!query.trim()) return [];

  // Fix #16: Use Algolia when configured, fall back to Postgres ILIKE
  const algoliaAppId = process.env.ALGOLIA_APP_ID;
  const algoliaApiKey = process.env.ALGOLIA_SEARCH_API_KEY;
  const algoliaIndex = process.env.ALGOLIA_INDEX_NAME;

  if (algoliaAppId && algoliaApiKey && algoliaIndex) {
    try {
      const { liteClient } = await import("algoliasearch/lite");
      const client = liteClient(algoliaAppId, algoliaApiKey);
      const { results } = await client.search({
        requests: [{ indexName: algoliaIndex, query, hitsPerPage: 50 }],
      });
      const searchResult = results[0];
      if (searchResult && "hits" in searchResult) {
        return searchResult.hits.map((hit: Record<string, unknown>) => ({
          id: String(hit.objectID ?? hit.id ?? ""),
          tenantId: null,
          algoliaObjectId: String(hit.objectID ?? ""),
          source: "system_library" as const,
          sourceName: hit.source ? String(hit.source) : "PEG Library",
          title: String(hit.title ?? ""),
          description: hit.description ? String(hit.description) : null,
          type: (hit.type === "pdf" ? "pdf" : "link") as "pdf" | "link",
          url: hit.url ? String(hit.url) : null,
          storagePath: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
      }
    } catch (err) {
      console.warn("[library] Algolia search failed, falling back to Postgres:", err);
    }
  }

  // Fallback: search system_library content in Postgres
  return db
    .select()
    .from(contentItems)
    .where(
      and(
        isNull(contentItems.tenantId),
        eq(contentItems.source, "system_library"),
        eq(contentItems.isActive, true),
        ilike(contentItems.title, `%${query}%`)
      )
    )
    .orderBy(contentItems.title)
    .limit(50);
}

export async function searchOrgContent(query: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select()
    .from(contentItems)
    .where(
      and(
        tenant.eq(contentItems.tenantId),
        eq(contentItems.isActive, true),
        eq(contentItems.source, "org_upload"),
        ilike(contentItems.title, `%${query}%`)
      )
    )
    .orderBy(contentItems.title)
    .limit(50);
}

export async function addOrgContent(params: {
  title: string;
  type: "pdf" | "link";
  url?: string;
  storagePath?: string;
  description?: string;
  folderId?: string;
}) {
  const session = await requireSession();

  const [item] = await db
    .insert(contentItems)
    .values({
      tenantId: session.user.tenantId,
      source: "org_upload",
      title: params.title,
      description: params.description ?? null,
      type: params.type,
      url: params.url,
      storagePath: params.storagePath ?? null,
      isActive: true,
    })
    .returning();

  // Fix #5: If a folder was selected, add the item to it
  if (item && params.folderId) {
    await db.insert(folderItems).values({
      tenantId: session.user.tenantId,
      folderId: params.folderId,
      contentItemId: item.id,
      addedBy: session.user.id,
      order: 0,
    }).onConflictDoNothing();
  }

  return item;
}

export async function deleteOrgContent(id: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(contentItems)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(contentItems.id, id), tenant.eq(contentItems.tenantId)));
}

// ── Folder queries ──────────────────────────────────────────────────────

export async function getFolders() {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Fix #21: Only show team folders that are published, plus user's own folders
  return db
    .select()
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        or(
          eq(folders.ownerId, session.user.id),
          and(eq(folders.type, "team"), eq(folders.isPublished, true))
        )
      )
    )
    .orderBy(folders.name);
}

export async function createFolder(name: string, type: "personal" | "team" = "personal") {
  const session = await requireSession();

  const [folder] = await db
    .insert(folders)
    .values({
      tenantId: session.user.tenantId,
      ownerId: session.user.id,
      name,
      type,
    })
    .returning();

  return folder;
}

export async function renameFolder(id: string, name: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(folders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)));
}

export async function deleteFolder(id: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Delete folder items first
  await db
    .delete(folderItems)
    .where(and(eq(folderItems.folderId, id), tenant.eq(folderItems.tenantId)));

  await db
    .delete(folders)
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)));
}

export async function getFolderItems(folderId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select({
      id: folderItems.id,
      contentItemId: folderItems.contentItemId,
      order: folderItems.order,
      title: contentItems.title,
      type: contentItems.type,
      url: contentItems.url,
      source: contentItems.source,
    })
    .from(folderItems)
    .innerJoin(contentItems, eq(folderItems.contentItemId, contentItems.id))
    .where(
      and(
        eq(folderItems.folderId, folderId),
        tenant.eq(folderItems.tenantId)
      )
    )
    .orderBy(folderItems.order);
}

/**
 * Toggle favorite status for a content item.
 * Creates/removes from the user's favorites folder.
 * For Algolia/system library items, upserts a content_items row first.
 */
export async function toggleFavorite(
  contentItemId: string,
  itemMeta?: { title: string; type: "pdf" | "link"; url?: string; algoliaObjectId?: string }
): Promise<boolean> {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  let resolvedId = contentItemId;

  // If this is an Algolia item, ensure it exists in content_items
  if (itemMeta?.algoliaObjectId) {
    const [existing] = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(
        and(
          eq(contentItems.algoliaObjectId, itemMeta.algoliaObjectId),
          isNull(contentItems.tenantId)
        )
      )
      .limit(1);

    if (existing) {
      resolvedId = existing.id;
    } else {
      const [created] = await db
        .insert(contentItems)
        .values({
          tenantId: null,
          algoliaObjectId: itemMeta.algoliaObjectId,
          source: "system_library",
          title: itemMeta.title,
          type: itemMeta.type,
          url: itemMeta.url ?? null,
          isActive: true,
        })
        .returning();
      resolvedId = created!.id;
    }
  }

  // Find or create the favorites folder for this user
  let [favFolder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        eq(folders.ownerId, session.user.id),
        eq(folders.type, "favorites")
      )
    )
    .limit(1);

  if (!favFolder) {
    const [created] = await db
      .insert(folders)
      .values({
        tenantId: session.user.tenantId,
        ownerId: session.user.id,
        name: "Favorites",
        type: "favorites",
      })
      .returning();
    favFolder = created!;
  }

  // Check if already favorited
  const [existingFav] = await db
    .select({ id: folderItems.id })
    .from(folderItems)
    .where(
      and(
        eq(folderItems.folderId, favFolder.id),
        eq(folderItems.contentItemId, resolvedId),
        tenant.eq(folderItems.tenantId)
      )
    )
    .limit(1);

  if (existingFav) {
    // Remove from favorites
    await db
      .delete(folderItems)
      .where(eq(folderItems.id, existingFav.id));
    return false; // no longer favorited
  } else {
    // Add to favorites
    await db
      .insert(folderItems)
      .values({
        tenantId: session.user.tenantId,
        folderId: favFolder.id,
        contentItemId: resolvedId,
        addedBy: session.user.id,
        order: 0,
      })
      .onConflictDoNothing();
    return true; // now favorited
  }
}

/**
 * Get all content item IDs that the current user has favorited.
 * Returns both the DB id and algoliaObjectId so the client can match either.
 */
export async function getFavoriteIds(): Promise<string[]> {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Find the favorites folder for this user
  const [favFolder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        eq(folders.ownerId, session.user.id),
        eq(folders.type, "favorites")
      )
    )
    .limit(1);

  if (!favFolder) return [];

  const items = await db
    .select({
      contentItemId: folderItems.contentItemId,
      algoliaObjectId: contentItems.algoliaObjectId,
    })
    .from(folderItems)
    .innerJoin(contentItems, eq(folderItems.contentItemId, contentItems.id))
    .where(
      and(
        eq(folderItems.folderId, favFolder.id),
        tenant.eq(folderItems.tenantId)
      )
    );

  // Return both DB ids and algolia object IDs so UI can match system library items
  const ids: string[] = [];
  for (const i of items) {
    ids.push(i.contentItemId);
    if (i.algoliaObjectId) ids.push(i.algoliaObjectId);
  }
  return ids;
}

/**
 * Get all favorited content items (including system library items).
 * Used in "My Materials" view to show favorites alongside uploads.
 */
export async function getFavoritedContent() {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  const [favFolder] = await db
    .select({ id: folders.id })
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        eq(folders.ownerId, session.user.id),
        eq(folders.type, "favorites")
      )
    )
    .limit(1);

  if (!favFolder) return [];

  return db
    .select({
      id: contentItems.id,
      title: contentItems.title,
      source: contentItems.source,
      type: contentItems.type,
      url: contentItems.url,
      algoliaObjectId: contentItems.algoliaObjectId,
      createdAt: contentItems.createdAt,
    })
    .from(folderItems)
    .innerJoin(contentItems, eq(folderItems.contentItemId, contentItems.id))
    .where(
      and(
        eq(folderItems.folderId, favFolder.id),
        tenant.eq(folderItems.tenantId)
      )
    );
}

export async function addToFolder(folderId: string, contentItemId: string) {
  const session = await requireSession();

  await db
    .insert(folderItems)
    .values({
      tenantId: session.user.tenantId,
      folderId,
      contentItemId,
      addedBy: session.user.id,
      order: 0,
    })
    .onConflictDoNothing();
}

export async function removeFromFolder(folderId: string, contentItemId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  await db
    .delete(folderItems)
    .where(
      and(
        eq(folderItems.folderId, folderId),
        eq(folderItems.contentItemId, contentItemId),
        tenant.eq(folderItems.tenantId)
      )
    );
}
