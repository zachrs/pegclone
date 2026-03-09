---
title: "[HIGH] Enforce permission checks in server actions"
labels: security, high, enhancement
---

## Problem

`src/lib/auth/permissions.ts` defines `can()` and `requirePermission()` functions with a full role-permission matrix, but these functions are never called in server actions. All admin actions only check `session.user.isAdmin` — there's no granular permission enforcement.

If a staff user somehow bypasses middleware (e.g., calls a server action directly), they can perform admin-only operations because actions don't verify permissions.

## Affected Files

Server actions that need permission checks:

| Action | File | Required Permission |
|--------|------|-------------------|
| `inviteUser` | `src/lib/actions/admin.ts` | `manage_users` |
| `deactivateUser` | `src/lib/actions/admin.ts` | `manage_users` |
| `updateUserRole` | `src/lib/actions/admin.ts` | `manage_users` |
| `addLibraryContent` | `src/lib/actions/library.ts` | `manage_content` |
| `deleteLibraryContent` | `src/lib/actions/library.ts` | `manage_content` |
| `sendContentToRecipients` | `src/lib/actions/send.ts` | `send_content` |
| `toggleReminder` | `src/lib/actions/reminders.ts` | `manage_reminders` |

## Fix

Replace `isAdmin` checks with `requirePermission()`:

```typescript
import { requirePermission } from "@/lib/auth/permissions";

export async function inviteUser(email: string, role: string) {
  const session = await getSession();
  requirePermission(session, "manage_users");  // throws if unauthorized
  // ... rest of function
}
```

## Verification

1. Staff user attempts to call `inviteUser` → gets "Missing permission: manage_users" error.
2. Admin user calls `inviteUser` → works normally.
3. Super admin can perform all actions.
