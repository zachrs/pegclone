---
title: "[LOW] Show per-invite error details in bulk invite dialog"
labels: bug, low, ux
---

## Problem

`src/components/admin/bulk-invite-dialog.tsx:186–187` — when some invites fail, the error message says `"Failed to send X invitation(s)"` with no detail about which ones failed or why.

## Fix

```typescript
const failures = results
  .map((r, i) => ({ result: r, invite: pendingInvites[i] }))
  .filter(
    ({ result }) =>
      result.status === "rejected" ||
      (result.status === "fulfilled" && result.value?.error)
  );

if (failures.length > 0) {
  const details = failures
    .map(({ invite, result }) => {
      const error =
        result.status === "rejected"
          ? result.reason?.message
          : result.value?.error;
      return `${invite.email}: ${error || "Unknown error"}`;
    })
    .join("\n");

  toast.error(`Failed to send ${failures.length} invitation(s):\n${details}`);
} else {
  toast.success(`Successfully sent ${pendingInvites.length} invitation(s)`);
  onClose();
}
```

## Verification

1. Bulk invite with one invalid email → error shows which email failed and why.
2. All valid emails → success toast.
