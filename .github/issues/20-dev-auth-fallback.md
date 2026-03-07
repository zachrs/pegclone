---
title: "[MEDIUM] Guard dev auth fallback against accidental staging use"
labels: security, medium, bug
---

## Problem

`src/lib/actions/auth.ts:32–48` — when `auth()` throws in development, `getSession()` falls back to `getDevSession()`, which auto-logs in the first active user from the database. If a staging environment accidentally runs with `NODE_ENV=development`, all authentication is bypassed.

```typescript
if (process.env.NODE_ENV === "development") {
  return getDevSession();
}
```

## Fix

Add a second guard — require an explicit opt-in env var:

```typescript
if (process.env.NODE_ENV === "development" && process.env.DEV_AUTO_LOGIN === "true") {
  console.warn("⚠️ Using dev auto-login — not for production use");
  return getDevSession();
}
```

Update `.env.local.example`:
```
# Development only — auto-login as first active user when auth fails
DEV_AUTO_LOGIN=true
```

## Verification

1. In development with `DEV_AUTO_LOGIN=true` → auto-login works as before.
2. In development without `DEV_AUTO_LOGIN` → auth failure returns null.
3. In production → fallback never triggers regardless of env vars.
