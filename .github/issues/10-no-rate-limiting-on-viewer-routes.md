---
title: "[HIGH] Add rate limiting and CORS to public viewer API routes"
labels: security, high
---

## Problem

Three public (unauthenticated) API endpoints have no rate limiting, no request body size limit, and no CORS configuration:

- `src/app/api/viewer/event/route.ts`
- `src/app/api/viewer/opt-out/route.ts`
- `src/app/api/viewer/pdf/route.ts`

An attacker can abuse these to:
- Inflate view counts via `/viewer/event`
- Opt out all recipients via `/viewer/opt-out` (with brute-forced tokens)
- DoS the server via `/viewer/pdf` (proxies external PDFs)

## Fix

Add rate limiting middleware for viewer routes. Use a simple IP-based limiter (or Redis for production):

```typescript
// src/lib/rate-limit.ts
const rateLimit = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 60,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const record = rateLimit.get(key);

  if (!record || now > record.resetAt) {
    rateLimit.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}
```

Apply to each viewer route:

```typescript
const ip = req.headers.get("x-forwarded-for") || "unknown";
if (!checkRateLimit(`viewer:${ip}`, 30, 60_000)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

For `/viewer/pdf`, also add a response size limit and timeout on the upstream fetch.

## Verification

1. Hit `/api/viewer/event` 31 times in 1 minute → 429 on 31st request.
2. Same for opt-out and pdf routes.
3. Normal usage (< 30 req/min) works fine.
