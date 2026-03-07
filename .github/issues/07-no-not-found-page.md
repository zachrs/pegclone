---
title: "[HIGH] Add not-found.tsx pages for proper 404 handling"
labels: bug, ux, high
---

## Problem

No `not-found.tsx` exists anywhere. Dynamic routes (`campaigns/[id]`, `super-admin/orgs/[orgId]`, `m/[token]`) handle missing data with inline JSX instead of calling Next.js `notFound()`. Users who hit bad URLs see inconsistent error states with no way to navigate back.

## Fix

1. Create root `not-found.tsx`:

```typescript
// src/app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-semibold">Page Not Found</h2>
      <p className="text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Button asChild>
        <Link href="/library">Go to Library</Link>
      </Button>
    </div>
  );
}
```

2. In dynamic route pages, replace inline error JSX with `notFound()`:

```typescript
import { notFound } from "next/navigation";

// In server component:
const campaign = await getCampaign(id);
if (!campaign) notFound();
```

## Verification

1. Navigate to `/nonexistent-page` → see styled 404 page.
2. Navigate to `/campaigns/nonexistent-id` → see 404.
3. All 404 pages have a working "Go to Library" link.
