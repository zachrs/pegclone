---
title: "[HIGH] Add error boundaries to all route groups"
labels: bug, ux, high
---

## Problem

Only one `error.tsx` exists (`src/app/m/[token]/error.tsx`). All other route groups — root, dashboard, admin, super-admin, auth pages — have no error boundary. Unhandled runtime errors render a blank white screen.

## Missing Files

- `src/app/error.tsx` (root fallback)
- `src/app/(dashboard)/error.tsx`
- `src/app/(super-admin)/error.tsx`
- `src/app/(auth)/error.tsx` (if auth layout exists)

## Fix

Create a reusable error boundary component and add `error.tsx` to each route group:

```typescript
// src/app/error.tsx
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

Copy/customize for each route group. The dashboard and admin versions can include the sidebar layout.

## Verification

1. Temporarily throw an error in a dashboard page component.
2. Confirm the error boundary renders instead of a white screen.
3. Confirm "Try again" button resets the error state.
