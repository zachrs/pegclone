---
title: "[HIGH] Replace in-memory login rate limiter with persistent store"
labels: security, high, enhancement
---

## Problem

`src/app/api/auth/[...nextauth]/route.ts:8–28` uses an in-memory `Map` for rate limiting login attempts:

- Lost on server restart or redeployment
- Not shared across serverless function instances (Vercel)
- Lazy cleanup only triggers at 100+ entries
- Effectively provides zero protection in production

## Affected File

`src/app/api/auth/[...nextauth]/route.ts` — lines 8–28

## Fix Options

**Option A: Vercel KV / Upstash Redis (recommended for Vercel deployments)**

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "15 m"),
  analytics: true,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response(
      JSON.stringify({ error: "Too many login attempts. Please try again later." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  return originalPOST(req);
}
```

**Option B: Keep in-memory but document the limitation**

If Redis isn't available, keep the current approach but add a code comment documenting the limitation and consider Vercel's built-in WAF rate limiting.

## Verification

1. Attempt 11 logins from same IP within 15 minutes → 429 on 11th.
2. Restart server → rate limit state persists (with Option A).
3. Different IPs are tracked independently.
