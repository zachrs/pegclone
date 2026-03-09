---
title: "[MEDIUM] Standardize API error response shapes"
labels: enhancement, medium, code-quality
---

## Problem

API routes return inconsistent error shapes:
- `/api/upload`: `{ error: string }`
- `/api/viewer/event`: `{ success: true }` or `{ error: string }`
- `/api/webhooks/mailgun`: `{ received: true }` or `{ error: string }`
- Server actions: `{ error?: string }` or `{ success: boolean, error?: string }`

This makes client-side error handling fragile and inconsistent.

## Fix

Define a standard response envelope:

```typescript
// src/lib/utils/api.ts
export function apiSuccess<T>(data?: T) {
  return NextResponse.json({ success: true, ...(data && { data }) });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
```

Migrate API routes to use the standard helpers. Webhook routes can keep `{ received: true }` for compatibility with external services.

## Verification

1. All API error responses have `{ success: false, error: "..." }` shape.
2. All API success responses have `{ success: true, data?: ... }` shape.
3. Client-side error handling uses consistent checks.
