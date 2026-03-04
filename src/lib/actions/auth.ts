"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, organizations } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
    mfaPending: boolean;
  };
  expires: string;
}

/**
 * Get the current authenticated user's session info.
 * Returns null if not authenticated.
 *
 * In development, falls back to the first active user in the DB
 * so pages work without a login session.
 */
export async function getSession(): Promise<PegSession | null> {
  try {
    const session = await auth();
    if (session && "user" in session && session.user?.id) {
      return session as unknown as PegSession;
    }
  } catch {
    // Auth provider unavailable
  }

  // Dev fallback: use the first active user
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
 * Change the current user's password.
 * Validates the current password before updating.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();

  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db
    .update(users)
    .set({ passwordHash: hash, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

/**
 * Get the current user's MFA status.
 */
export async function getMfaStatus(): Promise<{
  mfaEnabled: boolean;
  orgRequiresMfa: boolean;
}> {
  const session = await requireSession();

  const [user] = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  return {
    mfaEnabled: user?.mfaEnabled ?? false,
    orgRequiresMfa: org?.settings?.mfa?.required ?? false,
  };
}

/**
 * Enable or disable MFA for the current user.
 * Blocks disabling if the org requires MFA.
 */
export async function toggleMfa(
  enable: boolean
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();

  if (!enable) {
    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, session.user.tenantId))
      .limit(1);

    if (org?.settings?.mfa?.required) {
      return {
        success: false,
        error: "Your organization requires MFA. You cannot disable it.",
      };
    }
  }

  await db
    .update(users)
    .set({ mfaEnabled: enable, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

/**
 * Get the current user's profile info.
 */
export async function getProfile(): Promise<{
  id: string;
  fullName: string;
  email: string;
  role: string;
  title: string | null;
  photoUrl: string | null;
  showPhotoOnMessages: boolean;
}> {
  const session = await requireSession();

  const [user] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      title: users.title,
      photoUrl: users.photoUrl,
      settings: users.settings,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) throw new Error("User not found");

  const settings = (user.settings ?? {}) as Record<string, unknown>;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    title: user.title,
    photoUrl: user.photoUrl,
    showPhotoOnMessages: (settings.showPhotoOnMessages as boolean) ?? true,
  };
}

/**
 * Update the current user's profile photo URL.
 */
export async function updateProfilePhoto(
  photoUrl: string | null
): Promise<{ success: boolean }> {
  const session = await requireSession();

  await db
    .update(users)
    .set({ photoUrl, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

/**
 * Toggle whether the user's photo is shown on patient-facing messages.
 */
export async function updateShowPhotoOnMessages(
  show: boolean
): Promise<{ success: boolean }> {
  const session = await requireSession();

  const [user] = await db
    .select({ settings: users.settings })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const currentSettings = ((user?.settings ?? {}) as Record<string, unknown>);

  await db
    .update(users)
    .set({
      settings: { ...currentSettings, showPhotoOnMessages: show },
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

/**
 * Dev-only: return a fake session using the first active user in the DB.
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
        mfaPending: false,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };
  } catch {
    // DB not available
    return null;
  }
}
