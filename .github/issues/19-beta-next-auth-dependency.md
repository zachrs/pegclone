---
title: "[MEDIUM] Upgrade next-auth from beta to stable release"
labels: dependencies, medium, security
---

## Problem

`package.json` pins `next-auth@5.0.0-beta.30`. Beta versions may have:
- Unpatched security vulnerabilities
- Breaking changes in future betas
- No LTS support guarantees

## Affected File

`package.json` — line 41

## Fix

Check for latest stable Auth.js v5 release and upgrade:

```bash
npm info next-auth versions --json | jq '.[-5:]'
# Find latest stable 5.x release
npm install next-auth@latest
```

After upgrading, verify:
1. Auth callbacks still work (JWT, session, signIn)
2. MFA flow unchanged
3. Middleware `auth()` wrapper works
4. Login/logout/invite flows pass E2E tests

If no stable v5 exists yet, document the beta pinning and monitor https://github.com/nextauthjs/next-auth/releases.

## Verification

1. `npm ls next-auth` shows stable version.
2. All auth flows (login, MFA, password reset, invite) work.
3. No console warnings about deprecated APIs.
