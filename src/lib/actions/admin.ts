"use server";

import { db } from "@/lib/db";
import { organizations, users, folders } from "@/drizzle/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import { requirePermission } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/delivery/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { UserRole } from "@/lib/db/types";

// ── Helpers ────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ── User Management ─────────────────────────────────────────────────────

export async function getOrgUsers() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");

  const rows = await db
    .select()
    .from(users)
    .where(
      session.user.role === "super_admin"
        ? withTenant(session.user.tenantId).eq(users.tenantId)
        : and(
            withTenant(session.user.tenantId).eq(users.tenantId),
            ne(users.role, "super_admin")
          )
    )
    .orderBy(users.fullName);

  return rows;
}

export async function inviteUser(params: {
  fullName: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
  title?: string;
}): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");

  // Non-super-admins cannot create super_admin users
  if (params.role === "super_admin" && session.user.role !== "super_admin") {
    throw new Error("Unauthorized: cannot assign super_admin role");
  }

  // Check if email already exists in this tenant
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, session.user.tenantId),
        eq(users.email, params.email)
      )
    )
    .limit(1);

  if (existing) {
    return { success: false, error: "A user with this email already exists" };
  }

  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create user with placeholder password and invite token
  const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  await db.insert(users).values({
    tenantId: session.user.tenantId,
    passwordHash: placeholderHash,
    email: params.email,
    fullName: params.fullName,
    role: params.role,
    isAdmin: params.isAdmin,
    title: params.title ?? null,
    isActive: false,
    inviteTokenHash: tokenHash,
    inviteExpiresAt: expiresAt,
  });

  // Build invite URL
  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  // Get org name for the email
  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const orgName = org?.name ?? "Patient Education Genius";

  await sendEmail({
    to: params.email,
    subject: `You've been invited to ${orgName}`,
    text: `Hi ${params.fullName},\n\nYou've been invited to join ${orgName} on Patient Education Genius.\n\nClick the link below to set your password and activate your account:\n${inviteUrl}\n\nThis invitation expires in 7 days.\n\nBest,\n${orgName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0F766E;">You're Invited</h2>
        <p>Hi ${params.fullName},</p>
        <p>You've been invited to join <strong>${orgName}</strong> on Patient Education Genius.</p>
        <p>
          <a href="${inviteUrl}" style="display: inline-block; background: #0F766E; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            Set Your Password
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">This invitation expires in 7 days.</p>
      </div>
    `,
  });

  return { success: true };
}

export async function resendInvite(userId: string): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");
  const tenant = withTenant(session.user.tenantId);

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)))
    .limit(1);

  if (!user) return { success: false, error: "User not found" };
  if (user.isActive) return { success: false, error: "User is already active" };

  // Generate new token
  const token = generateInviteToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db
    .update(users)
    .set({ inviteTokenHash: tokenHash, inviteExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(users.id, userId));

  const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const orgName = org?.name ?? "Patient Education Genius";

  await sendEmail({
    to: user.email,
    subject: `Reminder: You've been invited to ${orgName}`,
    text: `Hi ${user.fullName},\n\nThis is a reminder that you've been invited to join ${orgName} on Patient Education Genius.\n\nClick the link below to set your password and activate your account:\n${inviteUrl}\n\nThis invitation expires in 7 days.\n\nBest,\n${orgName}`,
  });

  return { success: true };
}

/** Kept for backwards-compat but now just calls inviteUser */
export async function createUser(params: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isAdmin: boolean;
  title?: string;
}) {
  return inviteUser({
    fullName: params.fullName,
    email: params.email,
    role: params.role,
    isAdmin: params.isAdmin,
    title: params.title,
  });
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");
  const tenant = withTenant(session.user.tenantId);

  // Prevent non-super-admins from resetting super_admin passwords
  if (session.user.role !== "super_admin") {
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), tenant.eq(users.tenantId)))
      .limit(1);
    if (target?.role === "super_admin") {
      throw new Error("Unauthorized: cannot reset super_admin password");
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

export async function updateUser(
  userId: string,
  updates: { role?: UserRole; isAdmin?: boolean; title?: string | null }
) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");
  const tenant = withTenant(session.user.tenantId);

  // Prevent non-super-admins from editing super_admin users
  if (session.user.role !== "super_admin") {
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), tenant.eq(users.tenantId)))
      .limit(1);
    if (target?.role === "super_admin") {
      throw new Error("Unauthorized: cannot modify super_admin user");
    }
    if (updates.role === "super_admin") {
      throw new Error("Unauthorized: cannot assign super_admin role");
    }
  }

  await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

export async function deactivateUser(userId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");
  const tenant = withTenant(session.user.tenantId);

  // Prevent non-super-admins from deactivating super_admin users
  if (session.user.role !== "super_admin") {
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), tenant.eq(users.tenantId)))
      .limit(1);
    if (target?.role === "super_admin") {
      throw new Error("Unauthorized: cannot deactivate super_admin user");
    }
  }

  // Prevent deactivating yourself
  if (userId === session.user.id) {
    throw new Error("Cannot deactivate your own account");
  }

  await db
    .update(users)
    .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

export async function reactivateUser(userId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.users");
  const tenant = withTenant(session.user.tenantId);

  // Prevent non-super-admins from reactivating super_admin users
  if (session.user.role !== "super_admin") {
    const [target] = await db
      .select({ role: users.role })
      .from(users)
      .where(and(eq(users.id, userId), tenant.eq(users.tenantId)))
      .limit(1);
    if (target?.role === "super_admin") {
      throw new Error("Unauthorized: cannot reactivate super_admin user");
    }
  }

  await db
    .update(users)
    .set({
      isActive: true,
      deactivatedAt: null,
      activatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

// ── Accept Invite ──────────────────────────────────────────────────────

export async function acceptInvite(
  token: string,
  password: string
): Promise<{ success: boolean; error?: string; email?: string }> {
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const tokenHash = hashToken(token);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.inviteTokenHash, tokenHash))
    .limit(1);

  if (!user) {
    return { success: false, error: "Invalid or expired invitation link" };
  }

  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
    return { success: false, error: "This invitation has expired. Please ask your administrator to resend it." };
  }

  if (user.isActive && !user.inviteTokenHash) {
    return { success: false, error: "This account is already active" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db
    .update(users)
    .set({
      passwordHash,
      isActive: true,
      activatedAt: new Date(),
      inviteTokenHash: null,
      inviteExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));

  return { success: true, email: user.email };
}

export async function validateInviteToken(
  token: string
): Promise<{ valid: boolean; fullName?: string; email?: string; orgName?: string }> {
  const tokenHash = hashToken(token);

  const [user] = await db
    .select({
      fullName: users.fullName,
      email: users.email,
      tenantId: users.tenantId,
      inviteExpiresAt: users.inviteExpiresAt,
      isActive: users.isActive,
      inviteTokenHash: users.inviteTokenHash,
    })
    .from(users)
    .where(eq(users.inviteTokenHash, tokenHash))
    .limit(1);

  if (!user) return { valid: false };

  if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
    return { valid: false };
  }

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, user.tenantId))
    .limit(1);

  return {
    valid: true,
    fullName: user.fullName,
    email: user.email,
    orgName: org?.name ?? "your organization",
  };
}

// ── Branding ────────────────────────────────────────────────────────────

export async function getOrgBranding() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.branding");

  const [org] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      secondaryColor: organizations.secondaryColor,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  return org;
}

export async function updateBranding(params: {
  name: string;
  primaryColor: string;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  phone?: string;
  address?: string;
  website?: string;
}) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.branding");

  // Merge contact info into settings JSONB
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const currentSettings = org?.settings ?? {};

  await db
    .update(organizations)
    .set({
      name: params.name,
      primaryColor: params.primaryColor,
      secondaryColor: params.secondaryColor ?? null,
      ...(params.logoUrl !== undefined ? { logoUrl: params.logoUrl } : {}),
      settings: {
        ...currentSettings,
        contact: {
          phone: params.phone ?? "",
          address: params.address ?? "",
          website: params.website ?? "",
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.user.tenantId));
}

// ── Reminder Settings ───────────────────────────────────────────────────

export async function getReminderSettings() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.reminders");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const reminders = org?.settings?.reminders;
  return {
    enabled: reminders?.enabled ?? true,
    defaultMax: reminders?.default_max ?? 3,
    defaultIntervalHours: reminders?.default_interval_hours ?? 24,
  };
}

export async function updateReminderSettings(params: {
  enabled: boolean;
  defaultMax: number;
  defaultIntervalHours: number;
}) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.reminders");

  // Merge with existing settings
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const currentSettings = org?.settings ?? {};

  await db
    .update(organizations)
    .set({
      settings: {
        ...currentSettings,
        reminders: {
          enabled: params.enabled,
          default_max: params.defaultMax,
          default_interval_hours: params.defaultIntervalHours,
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.user.tenantId));
}

// ── Message Templates ───────────────────────────────────────────────────

export async function getMessageTemplates() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const templates = org?.settings?.message_templates;
  return {
    sms: templates?.sms ?? "[Organization Name] has sent you a message: [link]",
    emailSubject: templates?.email_subject ?? "[Organization Name] has sent you a message",
    emailBody:
      templates?.email_body ??
      "[Organization Name] has sent you a message. Click the link below to view it: [link]",
  };
}

export async function updateMessageTemplates(params: {
  sms: string;
  emailSubject: string;
  emailBody: string;
}) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const currentSettings = org?.settings ?? {};

  await db
    .update(organizations)
    .set({
      settings: {
        ...currentSettings,
        message_templates: {
          sms: params.sms,
          email_subject: params.emailSubject,
          email_body: params.emailBody,
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.user.tenantId));
}

// ── Delivery Settings ───────────────────────────────────────────────────

export async function getDeliverySettings() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const delivery = org?.settings?.delivery;
  return {
    linkExpirationDays: delivery?.link_expiration_days ?? 30,
    optOutFooter: delivery?.opt_out_footer ?? true,
  };
}

export async function updateDeliverySettings(params: {
  linkExpirationDays: number;
  optOutFooter: boolean;
}) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const currentSettings = org?.settings ?? {};

  await db
    .update(organizations)
    .set({
      settings: {
        ...currentSettings,
        delivery: {
          link_expiration_days: params.linkExpirationDays,
          opt_out_footer: params.optOutFooter,
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.user.tenantId));
}

// ── MFA / Security Settings ─────────────────────────────────────────────

export async function getMfaSettings() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  return {
    required: org?.settings?.mfa?.required ?? false,
  };
}

export async function updateMfaSettings(params: { required: boolean }) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.settings");

  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, session.user.tenantId))
    .limit(1);

  const currentSettings = org?.settings ?? {};

  await db
    .update(organizations)
    .set({
      settings: {
        ...currentSettings,
        mfa: {
          required: params.required,
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, session.user.tenantId));
}

// ── Team Folders ────────────────────────────────────────────────────────

export async function publishFolder(folderId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.team_folders");
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(folders)
    .set({
      type: "team",
      isPublished: true,
      publishedBy: session.user.id,
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(folders.id, folderId), tenant.eq(folders.tenantId)));
}

export async function unpublishFolder(folderId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "admin.team_folders");
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(folders)
    .set({
      type: "personal",
      isPublished: false,
      publishedBy: null,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(folders.id, folderId), tenant.eq(folders.tenantId)));
}

// ── Super Admin: Organizations ──────────────────────────────────────────

export async function getAllOrganizations() {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  const orgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      primaryColor: organizations.primaryColor,
      smsSendCountMonth: organizations.smsSendCountMonth,
      smsThrottled: organizations.smsThrottled,
      smsThrottleOverriddenAt: organizations.smsThrottleOverriddenAt,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(organizations.name);

  // Enrich with user/message counts
  const enriched = [];
  for (const org of orgs) {
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.tenantId, org.id));

    enriched.push({
      ...org,
      userCount: userCount?.count ?? 0,
      createdAt: org.createdAt.toISOString(),
      smsThrottleOverriddenAt: org.smsThrottleOverriddenAt?.toISOString() ?? null,
    });
  }

  return enriched;
}

export async function createOrganization(params: {
  name: string;
  slug: string;
  primaryColor: string;
}) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  const [org] = await db
    .insert(organizations)
    .values({
      name: params.name,
      slug: params.slug,
      primaryColor: params.primaryColor,
    })
    .returning();

  return org;
}

export async function getOrganization(orgId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return org;
}

export async function updateOrganization(
  orgId: string,
  params: { name?: string; slug?: string; primaryColor?: string }
) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  await db
    .update(organizations)
    .set({ ...params, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));
}

export async function getOrgUsersForSuperAdmin(orgId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  return db
    .select()
    .from(users)
    .where(eq(users.tenantId, orgId))
    .orderBy(users.fullName);
}

export async function createUserForOrg(
  orgId: string,
  params: {
    fullName: string;
    email: string;
    password: string;
    role: UserRole;
    isAdmin: boolean;
    title?: string;
  }
) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  const passwordHash = await bcrypt.hash(params.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      tenantId: orgId,
      passwordHash,
      email: params.email,
      fullName: params.fullName,
      role: params.role,
      isAdmin: params.isAdmin,
      title: params.title ?? null,
      isActive: true,
      activatedAt: new Date(),
    })
    .returning();

  return user;
}

export async function overrideSmsThrottle(orgId: string) {
  const session = await requireSession();
  requirePermission(session.user.role, session.user.isAdmin, "super_admin.orgs");

  await db
    .update(organizations)
    .set({
      smsThrottled: false,
      smsSendCountMonth: 0,
      smsThrottleOverriddenBy: session.user.id,
      smsThrottleOverriddenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}
