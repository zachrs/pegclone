---
title: "[CRITICAL] Mailgun webhook signature validation fails open when env var missing"
labels: security, critical, bug
---

## Problem

In `src/app/api/webhooks/mailgun/route.ts:18–36`, webhook signature validation is skipped in two scenarios:

1. **Not in production** — `process.env.NODE_ENV !== "production"` skips validation entirely.
2. **Missing env var in production** — if `MAILGUN_WEBHOOK_SIGNING_KEY` is undefined, the `if (signingKey)` block is skipped and the webhook is processed without validation.

```typescript
if (process.env.NODE_ENV === "production") {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (signingKey) {
    // validate ...
  }
  // ← falls through here if signingKey is missing!
}
// ← continues processing the webhook
```

An attacker can send forged webhooks to update sent content status (e.g., mark all emails as "delivered" or "failed").

## Affected File

`src/app/api/webhooks/mailgun/route.ts` — lines 18–36

## Fix

Always validate in production; fail if the key is missing:

```typescript
// Always validate signature (skip only in development/test)
if (process.env.NODE_ENV === "production") {
  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) {
    console.error("MAILGUN_WEBHOOK_SIGNING_KEY is not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const { timestamp, token, signature } = body.signature;
  const encodedToken = crypto
    .createHmac("sha256", signingKey)
    .update(timestamp + token)
    .digest("hex");

  if (encodedToken !== signature) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }
}
```

## Verification

1. Remove `MAILGUN_WEBHOOK_SIGNING_KEY` from env → webhook returns 500.
2. Set invalid key → webhook returns 401.
3. Set valid key + valid signature → webhook processes normally.
