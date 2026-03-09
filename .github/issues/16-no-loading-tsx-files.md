---
title: "[MEDIUM] Add loading.tsx Suspense fallbacks for route groups"
labels: enhancement, ux, medium
---

## Problem

Zero `loading.tsx` files exist. All pages use manual `useState`-based skeleton loaders. Users see no instant feedback during navigation between routes — the previous page hangs until the new one is ready.

## Fix

Add `loading.tsx` to key route groups:

```typescript
// src/app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}
```

Add to: `src/app/(dashboard)/loading.tsx`, `src/app/(super-admin)/loading.tsx`, and individual heavy pages like `library/loading.tsx`, `admin/loading.tsx`.

## Verification

1. Navigate between dashboard pages → instant skeleton fallback appears.
2. No visible "hang" on the previous page during navigation.
