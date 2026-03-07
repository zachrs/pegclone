---
title: "[MEDIUM] Add FileReader onerror handlers for file uploads"
labels: bug, medium, ux
---

## Problem

Two components set `reader.onload` but not `reader.onerror`:

- `src/components/send/send-wizard.tsx:122–143`
- `src/components/admin/bulk-invite-dialog.tsx:139–144`

If file reading fails (corrupt file, permissions issue), users get no feedback — the UI just hangs.

## Fix

Add `onerror` handler after each `onload`:

```typescript
// send-wizard.tsx
reader.onload = (e) => { /* existing logic */ };
reader.onerror = () => {
  toast.error("Failed to read file. Please try again.");
};

// bulk-invite-dialog.tsx
reader.onload = (e) => { /* existing logic */ };
reader.onerror = () => {
  setCsvErrors(["Failed to read file. Please try a different file."]);
  setIsProcessing(false);
};
```

## Verification

1. Upload a file that can't be read (e.g., permissions restricted) → error message shown.
2. Normal file uploads still work.
