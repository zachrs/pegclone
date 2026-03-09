---
title: "[LOW] Add aria-label to reminder toggle switch"
labels: accessibility, low
---

## Problem

`src/app/(dashboard)/admin/reminders/page.tsx:60` — the `<Switch>` component has no `aria-label` or associated label element. Screen readers announce it as an unlabeled toggle.

## Fix

```typescript
<Switch
  checked={reminder.isActive}
  onCheckedChange={(checked) => handleToggle(reminder.id, checked)}
  aria-label={`Toggle reminder: ${reminder.name || reminder.id}`}
/>
```

## Verification

1. Run axe or Lighthouse accessibility audit → no unlabeled toggle warnings.
