---
title: "[CRITICAL] Fix base URL construction — operator precedence bug"
labels: security, critical, bug
---

## Problem

The base URL is constructed incorrectly in 4 locations due to JavaScript operator precedence:

```typescript
const baseUrl = process.env.NEXTAUTH_URL ||
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
```

The `||` has lower precedence than `?`, so this evaluates as:

```typescript
const baseUrl = (process.env.NEXTAUTH_URL || process.env.VERCEL_URL)
  ? `https://${process.env.VERCEL_URL}`   // ← always uses VERCEL_URL, ignoring NEXTAUTH_URL
  : "http://localhost:3000";
```

If `NEXTAUTH_URL` is set but `VERCEL_URL` is not, baseUrl becomes `https://undefined`.

## Affected Files

| File | Lines |
|------|-------|
| `src/lib/actions/admin.ts` | 111–113, 179–181, 962–964 |
| `src/lib/actions/auth.ts` | ~300 |
| `src/app/api/debug-login/route.ts` | 80 |

## Fix

Extract into a shared utility and use correct logic:

```typescript
// src/lib/utils/url.ts
export function getBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
```

Then replace all 4 occurrences:

```typescript
import { getBaseUrl } from "@/lib/utils/url";

const baseUrl = getBaseUrl();
```

## Verification

1. Set only `NEXTAUTH_URL=https://app.peg.health` → invite/reset URLs use `https://app.peg.health`.
2. Set only `VERCEL_URL=my-app.vercel.app` → URLs use `https://my-app.vercel.app`.
3. Set neither → URLs use `http://localhost:3000`.
4. Set both → `NEXTAUTH_URL` takes priority.
