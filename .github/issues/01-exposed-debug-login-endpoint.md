---
title: "[CRITICAL] Remove or protect /api/debug-login endpoint"
labels: security, critical, bug
---

## Problem

`src/app/api/debug-login/route.ts` is a fully unauthenticated GET endpoint that exposes:

- Complete user list (emails, roles, activation status, org IDs)
- Superadmin email address and password hash prefix (first 20 chars)
- Whether `password123` validates against the superadmin hash
- `AUTH_SECRET` length
- Database connection status
- MFA code list (partially redacted)
- Computed base URL and all auth config

Any attacker who discovers `/api/debug-login` can enumerate users, test credentials, and gather reconnaissance for further attacks.

## Affected File

`src/app/api/debug-login/route.ts` — entire file (lines 1–113)

## Fix

**Option A (recommended): Delete the file entirely.**

```bash
rm src/app/api/debug-login/route.ts
```

**Option B: Gate behind superadmin auth + `NODE_ENV === "development"`.**

```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... existing debug logic
}
```

## Verification

1. Deploy and confirm `GET /api/debug-login` returns 404 (Option A) or 401 (Option B).
2. Confirm no other debug endpoints exist: `grep -r "debug" src/app/api/`.
