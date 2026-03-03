import type { UserRole } from "@/lib/db/types";

export const PERMISSIONS = {
  // Content library
  "library.view": ["super_admin", "cs_rep", "org_user", "provider"],
  "library.upload": ["super_admin", "org_user", "provider"],
  "library.edit": ["super_admin", "org_user", "provider"],

  // Sending
  "send.create": ["super_admin", "org_user", "provider"],
  "send.bulk": ["super_admin", "org_user", "provider"],

  // Recipients (PHI)
  "recipients.view": ["super_admin", "org_user", "provider"],

  // Analytics
  "analytics.personal": ["org_user", "provider"],
  "analytics.org": ["super_admin"],

  // Org admin (requires is_admin=true for org_user/provider)
  "admin.users": ["super_admin"],
  "admin.branding": ["super_admin"],
  "admin.reminders": ["super_admin"],
  "admin.settings": ["super_admin"],
  "admin.team_folders": ["super_admin"],

  // Super admin
  "super_admin.orgs": ["super_admin"],
  "super_admin.all_tenants": ["super_admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a user role has a given permission.
 * For org_user/provider, admin-level permissions also require is_admin=true.
 */
export function can(
  role: UserRole,
  isAdmin: boolean,
  permission: Permission
): boolean {
  const allowedRoles = PERMISSIONS[permission] as readonly string[];

  // Super admin always has access
  if (role === "super_admin") return true;

  // Check if role is in the allowed list
  if (!allowedRoles.includes(role)) {
    // For org_user/provider, also check if admin permissions apply
    if (isAdmin && (role === "org_user" || role === "provider")) {
      // Admin users get admin.* permissions
      if (permission.startsWith("admin.")) return true;
      if (permission === "analytics.org") return true;
    }
    return false;
  }

  return true;
}

/**
 * Throws an error if the user doesn't have the required permission.
 */
export function requirePermission(
  role: UserRole,
  isAdmin: boolean,
  permission: Permission
): void {
  if (!can(role, isAdmin, permission)) {
    throw new Error(
      `Unauthorized: role '${role}' does not have permission '${permission}'`
    );
  }
}
