"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "@/lib/db/types";

export interface PegSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isAdmin: boolean;
    tenantId: string;
    image?: string | null;
  };
  expires: string;
}

/**
 * Get the current authenticated user's session info.
 * Returns null if not authenticated.
 *
 * In development, falls back to the first active user in the DB
 * so pages work without Keycloak running.
 */
export async function getSession(): Promise<PegSession | null> {
  try {
    const session = await auth();
    if (session && "user" in session && session.user?.id) {
      return session as unknown as PegSession;
    }
  } catch {
    // Auth provider unavailable (e.g. Keycloak not running)
  }

  // Dev fallback: use the first active provider user
  if (process.env.NODE_ENV === "development") {
    return getDevSession();
  }

  return null;
}

/**
 * Require an authenticated session. Throws if not logged in.
 */
export async function requireSession(): Promise<PegSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/**
 * Dev-only: return a fake session using the first provider user in the DB.
 * This allows pages to work without running Keycloak.
 */
async function getDevSession(): Promise<PegSession | null> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.isActive, true))
      .limit(1);

    if (!user) return null;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        isAdmin: user.isAdmin,
        tenantId: user.tenantId,
        image: null,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
  } catch {
    // DB not available
    return null;
  }
}
