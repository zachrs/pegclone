import { db } from "@/lib/db";
import { messages, messageEvents, organizations, users, contentItems } from "@/drizzle/schema";
import { eq, inArray, isNull, and, or } from "drizzle-orm";
import crypto from "crypto";
import { ViewerContent } from "./viewer-content";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm text-center">
        <h1 className="text-xl font-semibold text-gray-800">
          Something Went Wrong
        </h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
      </div>
    </main>
  );
}

export default async function PatientViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  let token: string;
  try {
    ({ token } = await params);
  } catch {
    return <ErrorPage message="Invalid link. Please check the URL or contact your provider." />;
  }

  const tokenHash = hashToken(token);

  let msg;
  try {
    [msg] = await db
      .select({
        id: messages.id,
        tenantId: messages.tenantId,
        senderId: messages.senderId,
        contentBlocks: messages.contentBlocks,
        accessTokenExpiresAt: messages.accessTokenExpiresAt,
        openedAt: messages.openedAt,
      })
      .from(messages)
      .where(eq(messages.accessTokenHash, tokenHash))
      .limit(1);
  } catch (err) {
    console.error("[viewer] Failed to look up message:", err instanceof Error ? err.message : err);
    return <ErrorPage message="We're having trouble loading this page. Please try again in a moment." />;
  }

  if (!msg) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-800">
            Link Not Found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This link is invalid. Please check the URL or contact your
            provider.
          </p>
        </div>
      </main>
    );
  }

  // Get org info
  let org;
  try {
    [org] = await db
      .select({
        name: organizations.name,
        slug: organizations.slug,
        logoUrl: organizations.logoUrl,
        primaryColor: organizations.primaryColor,
        secondaryColor: organizations.secondaryColor,
        settings: organizations.settings,
      })
      .from(organizations)
      .where(eq(organizations.id, msg.tenantId))
      .limit(1);
  } catch (err) {
    console.error("[viewer] Failed to load org:", err instanceof Error ? err.message : err);
  }

  const orgPhone = (org?.settings as Record<string, Record<string, string>> | null)?.contact?.phone ?? null;
  const orgWebsite = (org?.settings as Record<string, Record<string, string>> | null)?.contact?.website ?? null;

  // Check expiration (message expiration per spec)
  const isExpired = msg.accessTokenExpiresAt && msg.accessTokenExpiresAt < new Date();

  if (isExpired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: (org?.primaryColor ?? "#2563EB") + "20" }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke={org?.primaryColor ?? "#2563EB"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800">
            This Link Has Expired
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This link is no longer active. Please contact your provider for a
            new link.
          </p>
          {orgPhone && (
            <p className="mt-4 text-sm text-gray-600">
              Contact {org?.name ?? "your provider"}:{" "}
              <a
                href={`tel:${orgPhone}`}
                className="font-medium underline"
                style={{ color: org?.primaryColor ?? "#2563EB" }}
              >
                {orgPhone}
              </a>
            </p>
          )}
        </div>
      </main>
    );
  }

  // Get sender (provider) info
  let sender;
  try {
    [sender] = await db
      .select({
        fullName: users.fullName,
        title: users.title,
        photoUrl: users.photoUrl,
      })
      .from(users)
      .where(eq(users.id, msg.senderId))
      .limit(1);
  } catch (err) {
    console.error("[viewer] Failed to load sender:", err instanceof Error ? err.message : err);
  }

  // Resolve content items from contentBlocks JSONB
  const blocks = (msg.contentBlocks ?? []) as Array<{
    type: string;
    content_item_id: string;
    order: number;
  }>;
  const allIds = blocks
    .map((b) => b.content_item_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  // Separate UUIDs from Algolia object IDs (non-UUID strings like "36850")
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const uuidIds = allIds.filter((id) => uuidPattern.test(id));
  const algoliaIds = allIds.filter((id) => !uuidPattern.test(id));

  let resolvedItems: Array<{
    id: string;
    title: string;
    type: "pdf" | "link";
    url: string;
  }> = [];

  if (allIds.length > 0) {
    try {
      // Query by UUID primary key OR by algoliaObjectId for legacy/Algolia items
      const conditions = [];
      if (uuidIds.length > 0) {
        conditions.push(inArray(contentItems.id, uuidIds));
      }
      if (algoliaIds.length > 0) {
        conditions.push(
          and(
            inArray(contentItems.algoliaObjectId, algoliaIds),
            isNull(contentItems.tenantId)
          )
        );
      }

      const items = await db
        .select({
          id: contentItems.id,
          algoliaObjectId: contentItems.algoliaObjectId,
          title: contentItems.title,
          type: contentItems.type,
          url: contentItems.url,
        })
        .from(contentItems)
        .where(conditions.length === 1 ? conditions[0]! : or(...conditions));

      // Build lookup maps: by UUID and by algoliaObjectId
      const itemByUuid = new Map(items.map((i) => [i.id, i]));
      const itemByAlgolia = new Map(
        items
          .filter((i) => i.algoliaObjectId)
          .map((i) => [i.algoliaObjectId!, i])
      );

      resolvedItems = blocks
        .sort((a, b) => a.order - b.order)
        .map((b) => itemByUuid.get(b.content_item_id) ?? itemByAlgolia.get(b.content_item_id))
        .filter((i): i is NonNullable<typeof i> => i != null)
        .map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          url: i.url ?? "",
        }));
    } catch (err) {
      console.error("[viewer] Failed to load content items:", err);
      throw err;
    }
  }

  // Update lastAccessedAt and mark as opened
  try {
    const now = new Date();
    await db
      .update(messages)
      .set({
        lastAccessedAt: now,
        ...(msg.openedAt ? {} : { openedAt: now }),
        updatedAt: now,
      })
      .where(eq(messages.id, msg.id));

    // Log "opened" event for audit trail (only on first open)
    if (!msg.openedAt) {
      await db.insert(messageEvents).values({
        tenantId: msg.tenantId,
        messageId: msg.id,
        eventType: "opened",
        payload: { source: "viewer" },
        occurredAt: now,
      });
    }
  } catch (err) {
    // Non-critical: don't block the viewer if event logging fails
    console.error("[viewer] Failed to log open event:", err instanceof Error ? err.message : err);
  }

  const viewerMessage = {
    id: msg.id,
    accessToken: token,
    expired: false,
    org: {
      name: org?.name ?? "Healthcare Provider",
      logoUrl: org?.logoUrl ?? null,
      primaryColor: org?.primaryColor ?? "#2563EB",
      secondaryColor: org?.secondaryColor ?? null,
      phone: orgPhone,
      website: orgWebsite,
    },
    provider: {
      name: sender?.fullName ?? "Your Provider",
      title: sender?.title ?? null,
      photoUrl: sender?.photoUrl ?? null,
    },
    contentItems: resolvedItems,
  };

  return <ViewerContent message={viewerMessage} />;
}
