---
title: "[MEDIUM] Add Content-Security-Policy and other security headers"
labels: security, medium, enhancement
---

## Problem

`next.config.ts` is empty — no security headers configured. Missing:
- `Content-Security-Policy` (XSS protection)
- `Permissions-Policy` (restrict browser APIs)
- `X-Content-Type-Options` (prevent MIME sniffing)
- `Referrer-Policy`
- `X-Frame-Options` (clickjacking protection)

## Affected File

`next.config.ts`

## Fix

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

Note: Add `Content-Security-Policy` carefully — start with report-only mode to avoid breaking inline styles used by Radix UI.

## Verification

1. Check response headers in browser dev tools → all headers present.
2. No functionality broken by the new headers.
