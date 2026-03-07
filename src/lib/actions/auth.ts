"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, organizations } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { UserRole } from "@/lib/db/types";
import { getBaseUrl } from "@/lib/utils/url";

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

  // Issue #20: Dev fallback requires explicit opt-in via DEV_AUTO_LOGIN
  if (process.env.NODE_ENV === "development" && process.env.DEV_AUTO_LOGIN === "true") {
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
  defaultDeliveryChannel: string;
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
    defaultDeliveryChannel: (settings.defaultDeliveryChannel as string) ?? "email",
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
 * Fix #26: Update default delivery channel preference.
 */
export async function updateDefaultDeliveryChannel(
  channel: "email" | "sms"
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
      settings: { ...currentSettings, defaultDeliveryChannel: channel },
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}

/**
 * Fix #17: Request a password reset email.
 * Always returns success to avoid email enumeration.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean }> {
  const [user] = await db
    .select({ id: users.id, tenantId: users.tenantId, fullName: users.fullName, isActive: users.isActive })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);

  // Don't reveal if email exists
  if (!user || !user.isActive) {
    return { success: true };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db
    .update(users)
    .set({ resetTokenHash: tokenHash, resetExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, user.tenantId))
    .limit(1);

  const orgName = org?.name ?? "Patient Education Genius";

  const { sendEmail } = await import("@/lib/delivery/email");
  await sendEmail({
    to: email,
    subject: `Reset your ${orgName} password`,
    text: `Hi ${user.fullName},\n\nWe received a request to reset your password for ${orgName}.\n\nClick the link below to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F766E;">Reset Your Password</h2>
        <p>Hi ${user.fullName},</p>
        <p>We received a request to reset your password for <strong>${orgName}</strong>.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #0F766E; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Reset Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { success: true };
}

/**
 * Fix #17: Validate a password reset token.
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db
    .select({ email: users.email, resetExpiresAt: users.resetExpiresAt })
    .from(users)
    .where(eq(users.resetTokenHash, tokenHash))
    .limit(1);

  if (!user) return { valid: false };
  if (user.resetExpiresAt && user.resetExpiresAt < new Date()) return { valid: false };

  return { valid: true, email: user.email };
}

/**
 * Fix #17: Reset password using a valid reset token.
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [user] = await db
    .select({ id: users.id, resetExpiresAt: users.resetExpiresAt })
    .from(users)
    .where(eq(users.resetTokenHash, tokenHash))
    .limit(1);

  if (!user) {
    return { success: false, error: "Invalid or expired reset link" };
  }

  if (user.resetExpiresAt && user.resetExpiresAt < new Date()) {
    return { success: false, error: "This reset link has expired. Please request a new one." };
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({
      passwordHash: hash,
      resetTokenHash: null,
      resetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { success: true };
}

/**
 * Get the current user's organization info (name, logo, primaryColor).
 * Available to all authenticated users — used in the app sidebar.
 */
export async function getOrgInfo(): Promise<{
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}> {
  const session = await requireSession();

  const [org] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
    })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  return {
    name: org?.name ?? "Organization",
    logoUrl: org?.logoUrl ?? null,
    primaryColor: org?.primaryColor ?? "#2563EB",
  };
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
