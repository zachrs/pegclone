"use server";

import { db } from "@/lib/db";
import { contentItems, folders, folderItems, folderShares, users } from "@/drizzle/schema";
import { eq, and, ilike, or, desc, isNull, inArray, sql, asc } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import { escapeLike } from "@/lib/utils/search";

// ── Content queries ─────────────────────────────────────────────────────

export async function getOrgContent() {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select({
      id: contentItems.id,
      tenantId: contentItems.tenantId,
      algoliaObjectId: contentItems.algoliaObjectId,
      source: contentItems.source,
      title: contentItems.title,
      description: contentItems.description,
      type: contentItems.type,
      url: contentItems.url,
      storagePath: contentItems.storagePath,
      isActive: contentItems.isActive,
      createdBy: contentItems.createdBy,
      createdAt: contentItems.createdAt,
      updatedAt: contentItems.updatedAt,
      uploadedBy: users.fullName,
    })
    .from(contentItems)
    .leftJoin(users, eq(contentItems.createdBy, users.id))
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
        const hits = searchResult.hits as Array<Record<string, unknown>>;

        // Ensure each Algolia item exists in the DB with its URL so that
        // downstream flows (send, viewer) can look them up by UUID.
        const dbItems = await ensureSystemLibraryItems(
          hits.map((hit) => ({
            algoliaObjectId: String(hit.objectID ?? ""),
            title: String(hit.title ?? ""),
            type: (hit.type === "pdf" ? "pdf" : "link") as "pdf" | "link",
            url: hit.url ? String(hit.url) : null,
            source: hit.source ? String(hit.source) : "PEG Library",
            description: hit.description ? String(hit.description) : null,
          }))
        );

        return dbItems.map((item) => ({
          ...item,
          sourceName: item.description ?? "PEG Library",
          storagePath: null,
          isActive: true,
          createdAt: item.createdAt ?? new Date(),
          updatedAt: item.updatedAt ?? new Date(),
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
        ilike(contentItems.title, `%${escapeLike(query)}%`)
      )
    )
    .orderBy(contentItems.title)
    .limit(50);
}

/**
 * Ensure Algolia system library items exist in the content_items table
 * with correct URLs. Returns DB rows with real UUIDs.
 */
async function ensureSystemLibraryItems(
  items: Array<{
    algoliaObjectId: string;
    title: string;
    type: "pdf" | "link";
    url: string | null;
    source: string;
    description: string | null;
  }>
) {
  const algoliaIds = items
    .map((i) => i.algoliaObjectId)
    .filter((id) => id.length > 0);

  if (algoliaIds.length === 0) return [];

  // Find existing rows by algoliaObjectId
  const existing = await db
    .select()
    .from(contentItems)
    .where(
      and(
        inArray(contentItems.algoliaObjectId, algoliaIds),
        isNull(contentItems.tenantId)
      )
    );

  const existingByAlgolia = new Map(
    existing.map((row) => [row.algoliaObjectId, row])
  );

  const result = [];

  for (const item of items) {
    const dbRow = existingByAlgolia.get(item.algoliaObjectId);

    if (dbRow) {
      // Update URL if it was missing or changed
      if (item.url && dbRow.url !== item.url) {
        await db
          .update(contentItems)
          .set({ url: item.url, updatedAt: new Date() })
          .where(eq(contentItems.id, dbRow.id));
        result.push({ ...dbRow, url: item.url });
      } else {
        result.push(dbRow);
      }
    } else {
      // Create new row
      const [created] = await db
        .insert(contentItems)
        .values({
          tenantId: null,
          algoliaObjectId: item.algoliaObjectId,
          source: "system_library",
          title: item.title,
          description: item.description,
          type: item.type,
          url: item.url,
          isActive: true,
        })
        .returning();
      if (created) result.push(created);
    }
  }

  return result;
}

export async function searchOrgContent(query: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select({
      id: contentItems.id,
      tenantId: contentItems.tenantId,
      algoliaObjectId: contentItems.algoliaObjectId,
      source: contentItems.source,
      title: contentItems.title,
      description: contentItems.description,
      type: contentItems.type,
      url: contentItems.url,
      storagePath: contentItems.storagePath,
      isActive: contentItems.isActive,
      createdBy: contentItems.createdBy,
      createdAt: contentItems.createdAt,
      updatedAt: contentItems.updatedAt,
      uploadedBy: users.fullName,
    })
    .from(contentItems)
    .leftJoin(users, eq(contentItems.createdBy, users.id))
    .where(
      and(
        tenant.eq(contentItems.tenantId),
        eq(contentItems.isActive, true),
        eq(contentItems.source, "org_upload"),
        ilike(contentItems.title, `%${escapeLike(query)}%`)
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
      createdBy: session.user.id,
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

  // Show: user's own folders, published team folders, and folders shared with this user
  const sharedFolderIds = db
    .select({ folderId: folderShares.folderId })
    .from(folderShares)
    .where(
      and(
        eq(folderShares.userId, session.user.id),
        tenant.eq(folderShares.tenantId)
      )
    );

  return db
    .select()
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        or(
          eq(folders.ownerId, session.user.id),
          and(eq(folders.type, "team"), eq(folders.isPublished, true)),
          inArray(folders.id, sharedFolderIds)
        )
      )
    )
    .orderBy(asc(folders.sortOrder), asc(folders.name));
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

  // Fetch folder to check authorization
  const [folder] = await db
    .select({ ownerId: folders.ownerId, type: folders.type })
    .from(folders)
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)))
    .limit(1);

  if (!folder) throw new Error("Folder not found");
  if (folder.type === "favorites") throw new Error("Cannot rename favorites folder");

  if (folder.type === "team") {
    if (!session.user.isAdmin) throw new Error("Only admins can rename team folders");
  } else {
    if (folder.ownerId !== session.user.id) throw new Error("You can only rename your own folders");
  }

  await db
    .update(folders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)));
}

export async function deleteFolder(id: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Fetch the folder to check ownership and type
  const [folder] = await db
    .select({ ownerId: folders.ownerId, type: folders.type })
    .from(folders)
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)))
    .limit(1);

  if (!folder) throw new Error("Folder not found");

  // Prevent deleting favorites folders
  if (folder.type === "favorites") throw new Error("Cannot delete favorites folder");

  // Authorization: personal folders → owner only; team folders → admin only
  if (folder.type === "team") {
    if (!session.user.isAdmin) throw new Error("Only admins can delete team folders");
  } else {
    if (folder.ownerId !== session.user.id) throw new Error("You can only delete your own folders");
  }

  // Delete folder items first
  await db
    .delete(folderItems)
    .where(and(eq(folderItems.folderId, id), tenant.eq(folderItems.tenantId)));

  await db
    .delete(folders)
    .where(and(eq(folders.id, id), tenant.eq(folders.tenantId)));
}

export async function reorderFolders(folderIds: string[]) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Update sort_order for each folder the user owns or (for team folders) is admin
  const updates = folderIds.map((id, index) =>
    db
      .update(folders)
      .set({ sortOrder: index, updatedAt: new Date() })
      .where(
        and(
          eq(folders.id, id),
          tenant.eq(folders.tenantId),
          or(
            eq(folders.ownerId, session.user.id),
            session.user.isAdmin ? eq(folders.type, "team") : sql`false`
          )
        )
      )
  );

  await Promise.all(updates);
}

// ── Folder sharing ─────────────────────────────────────────────────────

export async function getShareableUsers() {
  const session = await requireSession();
  if (!session.user.isAdmin) throw new Error("Only admins can share folders");
  const tenant = withTenant(session.user.tenantId);

  return db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
    })
    .from(users)
    .where(
      and(
        tenant.eq(users.tenantId),
        eq(users.isActive, true)
      )
    )
    .orderBy(asc(users.fullName));
}

export async function getFolderShares(folderId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  // Verify the folder belongs to this tenant and user is owner or admin
  const [folder] = await db
    .select({ ownerId: folders.ownerId })
    .from(folders)
    .where(and(eq(folders.id, folderId), tenant.eq(folders.tenantId)))
    .limit(1);

  if (!folder) throw new Error("Folder not found");
  if (folder.ownerId !== session.user.id && !session.user.isAdmin) {
    throw new Error("Not authorized");
  }

  return db
    .select({
      userId: folderShares.userId,
      fullName: users.fullName,
      email: users.email,
      sharedAt: folderShares.createdAt,
    })
    .from(folderShares)
    .innerJoin(users, eq(folderShares.userId, users.id))
    .where(
      and(
        eq(folderShares.folderId, folderId),
        tenant.eq(folderShares.tenantId)
      )
    )
    .orderBy(asc(users.fullName));
}

export async function shareFolderWithUsers(folderId: string, userIds: string[]) {
  const session = await requireSession();
  if (!session.user.isAdmin) throw new Error("Only admins can share folders");
  const tenant = withTenant(session.user.tenantId);

  // Verify the folder belongs to this tenant
  const [folder] = await db
    .select({ ownerId: folders.ownerId })
    .from(folders)
    .where(and(eq(folders.id, folderId), tenant.eq(folders.tenantId)))
    .limit(1);

  if (!folder) throw new Error("Folder not found");

  if (userIds.length === 0) return;

  // Insert shares, ignoring duplicates
  await db
    .insert(folderShares)
    .values(
      userIds.map((userId) => ({
        tenantId: session.user.tenantId,
        folderId,
        userId,
        sharedBy: session.user.id,
      }))
    )
    .onConflictDoNothing();
}

export async function unshareFolderFromUsers(folderId: string, userIds: string[]) {
  const session = await requireSession();
  if (!session.user.isAdmin) throw new Error("Only admins can unshare folders");
  const tenant = withTenant(session.user.tenantId);

  if (userIds.length === 0) return;

  await db
    .delete(folderShares)
    .where(
      and(
        eq(folderShares.folderId, folderId),
        inArray(folderShares.userId, userIds),
        tenant.eq(folderShares.tenantId)
      )
    );
}

export async function shareWithAllOrgUsers(folderId: string) {
  const session = await requireSession();
  if (!session.user.isAdmin) throw new Error("Only admins can share folders");
  const tenant = withTenant(session.user.tenantId);

  // Get all active users in the org
  const orgUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        tenant.eq(users.tenantId),
        eq(users.isActive, true)
      )
    );

  const userIds = orgUsers
    .map((u) => u.id)
    .filter((id) => id !== session.user.id); // Don't share with yourself (owner)

  if (userIds.length === 0) return;

  await db
    .insert(folderShares)
    .values(
      userIds.map((userId) => ({
        tenantId: session.user.tenantId,
        folderId,
        userId,
        sharedBy: session.user.id,
      }))
    )
    .onConflictDoNothing();
}

export async function unshareFromAllUsers(folderId: string) {
  const session = await requireSession();
  if (!session.user.isAdmin) throw new Error("Only admins can unshare folders");
  const tenant = withTenant(session.user.tenantId);

  await db
    .delete(folderShares)
    .where(
      and(
        eq(folderShares.folderId, folderId),
        tenant.eq(folderShares.tenantId)
      )
    );
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
