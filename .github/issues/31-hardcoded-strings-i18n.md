---
title: "[LOW] Extract hardcoded UI strings for future i18n"
labels: enhancement, low, i18n
---

## Problem

30+ UI strings are hardcoded across components: button labels, error messages, page titles, form placeholders. No internationalization layer exists.

## Fix

For now, extract strings into a constants file to prepare for i18n:

```typescript
// src/lib/constants/strings.ts
export const strings = {
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    loading: "Loading...",
  },
  auth: {
    loginTitle: "Sign In",
    invalidCredentials: "Invalid email or password",
    // ...
  },
  library: {
    addContent: "Add Content",
    titleRequired: "Title is required",
    // ...
  },
} as const;
```

When i18n is needed, swap this with `next-intl` or `react-i18next`.

## Verification

1. No behavioral changes — just string extraction.
2. Strings are importable from a single source.
