---
title: "[CRITICAL] Protect /api/seed endpoint from production access"
labels: security, critical, bug
---

## Problem

`src/app/api/seed/route.ts` has no authentication and no environment check. Calling `POST /api/seed`:

1. **Deletes all data** — campaigns, recipients, users, organizations (lines 19–26)
2. **Creates users with hardcoded `password123`** (line 46)
3. **Returns all seeded credentials** in the response body (line 202: `"All users have password: password123"`)

## Affected File

`src/app/api/seed/route.ts` — entire file (lines 1–228)

## Fix

**Option A (recommended): Delete the file, use a CLI seed script instead.**

```bash
rm src/app/api/seed/route.ts
# Move seed logic to scripts/seed.ts and run via: npx tsx scripts/seed.ts
```

**Option B: Guard with environment check + auth.**

```typescript
export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ... existing seed logic, but remove the password note from response
}
```

## Verification

1. `POST /api/seed` returns 404 in production.
2. Confirm no hardcoded passwords exist in API responses.
