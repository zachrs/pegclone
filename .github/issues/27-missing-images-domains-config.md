---
title: "[MEDIUM] Configure remote image patterns for Vercel Blob URLs"
labels: bug, medium, config
---

## Problem

`next.config.ts` has no `images.remotePatterns` configured. If `<Image>` components reference Vercel Blob URLs for org logos or uploaded content, they'll fail with Next.js image optimization errors.

## Fix

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
```

## Verification

1. Upload an image via Vercel Blob → `<Image>` component renders it without errors.
2. No "hostname not configured" warnings in the console.
