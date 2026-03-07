---
title: "[MEDIUM] Add CSRF protection to public viewer POST endpoints"
labels: security, medium
---

## Problem

`src/app/api/viewer/opt-out/route.ts` and `src/app/api/viewer/event/route.ts` are POST endpoints with no CSRF token validation. While they are token-gated (require a valid access token), a malicious site could submit a cross-origin form POST if it knows or brute-forces the token.

## Fix

Require JSON content type (which triggers CORS preflight and prevents form submission):

```typescript
export async function POST(req: NextRequest) {
  // Reject non-JSON requests (prevents CSRF via form submission)
  const contentType = req.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 415 });
  }

  // ... existing logic
}
```

Also add CORS headers to viewer routes if they're called from a different origin:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
```

## Verification

1. Submit a form POST to `/api/viewer/opt-out` → 415 error.
2. Send JSON POST via fetch → works normally.
3. CORS preflight returns correct headers.
