---
title: "[CRITICAL] Fix MFA bypass — middleware doesn't block app routes when MFA pending"
labels: security, critical, bug
---

## Problem

In `src/middleware.ts:14–19`, when `mfaPending` is true, the middleware only redirects users who are NOT on `/mfa-verify` to `/mfa-verify`. But users who directly navigate to `/library`, `/admin`, `/dashboard`, etc. can bypass MFA entirely because the check structure allows `NextResponse.next()` to proceed for authenticated users on non-public routes.

**Current code (lines 13–19):**

```typescript
if (mfaPending) {
  if (!nextUrl.pathname.startsWith("/mfa-verify")) {
    return NextResponse.redirect(new URL("/mfa-verify", nextUrl));
  }
  return NextResponse.next();
}
```

This looks correct at first glance — the `if (!startsWith("/mfa-verify"))` should catch everything else. However, the `/mfa-verify` path itself should also be allowed through (which it is via the `return NextResponse.next()`).

**The actual bug**: The `/api` routes and `/m/` routes are excluded from the middleware matcher entirely (line 58), so any API calls made while MFA is pending will succeed without MFA completion. Server actions called from the client will execute without MFA verification.

## Affected File

`src/middleware.ts` — lines 14–19 and matcher config (lines 52–58)

## Fix

Add MFA check to server actions and API routes that handle sensitive operations:

```typescript
// src/lib/actions/auth.ts — add helper
export async function requireCompletedMfa() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.mfaPending) throw new Error("MFA verification required");
  return session;
}
```

Then use `requireCompletedMfa()` instead of `getSession()` in sensitive server actions like `inviteUser`, `deactivateUser`, `sendContentToRecipients`, etc.

Also add `/api` MFA check for non-auth API routes:

```typescript
// In API route handlers:
const session = await auth();
if (session?.user?.mfaPending) {
  return NextResponse.json({ error: "MFA required" }, { status: 403 });
}
```

## Verification

1. Enable MFA for a test user.
2. Login, get redirected to `/mfa-verify`.
3. Attempt to call server actions (e.g., via browser console) — should fail.
4. Attempt to hit `/api/upload` — should return 403.
5. Complete MFA → all actions should work.
