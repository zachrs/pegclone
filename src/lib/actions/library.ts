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
  // In production, this would query Algolia.
  // For now, search system_library content in Postgres.
  if (!query.trim()) return [];

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
}) {
  const session = await requireSession();

  const [item] = await db
    .insert(contentItems)
    .values({
      tenantId: session.user.tenantId,
      source: "org_upload",
      title: params.title,
      type: params.type,
      url: params.url,
      isActive: true,
    })
    .returning();

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

  return db
    .select()
    .from(folders)
    .where(
      and(
        tenant.eq(folders.tenantId),
        or(
          eq(folders.ownerId, session.user.id),
          eq(folders.type, "team")
        )
      )
    )
    .orderBy(folders.name);
}

export async function createFolder(name: string) {
  const session = await requireSession();

  const [folder] = await db
    .insert(folders)
    .values({
      tenantId: session.user.tenantId,
      ownerId: session.user.id,
      name,
      type: "personal",
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
