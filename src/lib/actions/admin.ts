"use server";

import { db } from "@/lib/db";
import { organizations, users, folders } from "@/drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { requireSession } from "./auth";
import { withTenant } from "@/lib/tenancy";
import bcrypt from "bcryptjs";
import type { UserRole } from "@/lib/db/types";

// ── User Management ─────────────────────────────────────────────────────

export async function getOrgUsers() {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  return db
    .select()
    .from(users)
    .where(tenant.eq(users.tenantId))
    .orderBy(users.fullName);
}

export async function createUser(params: {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  isAdmin: boolean;
  title?: string;
}) {
  const session = await requireSession();
  const passwordHash = await bcrypt.hash(params.password, 10);

  const [user] = await db
    .insert(users)
    .values({
      tenantId: session.user.tenantId,
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

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);
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
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

export async function deactivateUser(userId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

  await db
    .update(users)
    .set({ isActive: false, deactivatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, userId), tenant.eq(users.tenantId)));
}

export async function reactivateUser(userId: string) {
  const session = await requireSession();
  const tenant = withTenant(session.user.tenantId);

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

// ── Branding ────────────────────────────────────────────────────────────

export async function getOrgBranding() {
  const session = await requireSession();

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
  phone?: string;
  address?: string;
  website?: string;
}) {
  const session = await requireSession();

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
  // Only super_admin should call this
  const session = await requireSession();
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

  await db
    .update(organizations)
    .set({ ...params, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));
}

export async function getOrgUsersForSuperAdmin(orgId: string) {
  const session = await requireSession();
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
  if (session.user.role !== "super_admin") {
    throw new Error("Unauthorized: super_admin only");
  }

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
