---
title: "[LOW] Replace index-based React keys with stable identifiers"
labels: bug, low, code-quality
---

## Problem

Three components use array index as React `key` on dynamic lists:

- `src/components/layout/header.tsx:21` — nav items
- `src/components/admin/bulk-invite-dialog.tsx:231` — CSV preview table headers
- `src/components/admin/bulk-invite-dialog.tsx:351` — pending invites table rows

Index keys cause incorrect reconciliation if list items are reordered, added, or removed.

## Fix

**header.tsx:** Use the nav item's href or label:
```typescript
{navItems.map((item) => (
  <NavLink key={item.href} ... />
))}
```

**bulk-invite-dialog.tsx (headers):** Use header text:
```typescript
{csvPreview.headers.map((header) => (
  <TableHead key={header}>{header}</TableHead>
))}
```

**bulk-invite-dialog.tsx (invites):** Use email:
```typescript
{pendingInvites.map((invite) => (
  <TableRow key={invite.email}>
```

## Verification

1. No React key warnings in console.
2. Dynamic lists update correctly when items change.
