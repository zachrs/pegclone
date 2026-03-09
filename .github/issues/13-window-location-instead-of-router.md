---
title: "[HIGH] Use Next.js router instead of window.location.href"
labels: bug, high, ux
---

## Problem

`src/components/send/send-wizard.tsx` uses `window.location.href = "/library"` (lines 276, 772) for navigation. This causes a full page reload, losing all React state, and bypasses Next.js client-side routing optimizations.

## Fix

```typescript
import { useRouter } from "next/navigation";

// Inside component:
const router = useRouter();

// Replace:
window.location.href = "/library";

// With:
router.push("/library");
```

Apply at both occurrences (line 276 and line 772).

## Verification

1. Complete the send wizard → redirects to library without full page reload.
2. Click "Back to Library" button → same behavior.
3. Browser back button still works correctly.
