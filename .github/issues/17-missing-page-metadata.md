---
title: "[MEDIUM] Add page metadata/SEO to all routes"
labels: enhancement, seo, medium
---

## Problem

Only the root layout exports `metadata`. All 20+ pages lack individual `title`/`description` exports. Browser tabs show the same generic title for every page, and search engines can't differentiate pages.

## Fix

Add metadata exports to each page:

```typescript
// src/app/(dashboard)/library/page.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content Library | Peg Health",
  description: "Manage your patient education content library",
};
```

Pages to update:
- `/library` → "Content Library | Peg Health"
- `/admin` → "Admin Dashboard | Peg Health"
- `/admin/users` → "User Management | Peg Health"
- `/admin/reminders` → "Reminders | Peg Health"
- `/super-admin` → "Super Admin | Peg Health"
- `/login` → "Sign In | Peg Health"
- `/forgot-password` → "Reset Password | Peg Health"
- `/mfa-verify` → "Verify Identity | Peg Health"
- All other route pages

## Verification

1. Navigate to each page → browser tab shows the correct title.
2. View page source → `<title>` and `<meta name="description">` are present.
