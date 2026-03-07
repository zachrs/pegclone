---
title: "[MEDIUM] Remove console.error calls from production component code"
labels: bug, medium, code-quality
---

## Problem

`src/components/library/add-content-dialog.tsx` has `console.error()` calls (lines 104, 227) that leak internal error details to the browser console in production.

## Fix

Remove the `console.error` lines — the `toast.error()` calls already handle user feedback:

```typescript
// Before:
console.error("Error adding content:", result.error);
toast.error(result.error);

// After:
toast.error(result.error);
```

Apply to both occurrences (lines 104 and 227).

If error reporting is needed, integrate a service like Sentry instead of `console.error`.

## Verification

1. Trigger an add-content error → no console output, toast still shows.
