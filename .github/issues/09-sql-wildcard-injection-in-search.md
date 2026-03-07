---
title: "[HIGH] Escape SQL wildcards in search queries"
labels: security, high, bug
---

## Problem

Search functions use `ilike(column, `%${search}%`)` without escaping `%` and `_` characters. A user searching for `%` or `_` gets unintended results.

## Affected Files

| File | Lines |
|------|-------|
| `src/lib/actions/recipients.ts` | 33–35, 106 |
| `src/lib/actions/library.ts` | 99 |

## Fix

Add an escape utility and use it in all search queries:

```typescript
// src/lib/utils/search.ts
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}
```

Then in each search function:

```typescript
import { escapeLike } from "@/lib/utils/search";

// Before:
ilike(recipients.firstName, `%${search}%`)

// After:
ilike(recipients.firstName, `%${escapeLike(search)}%`)
```

Apply to all 3 files / 5 occurrences.

## Verification

1. Search for `%` → returns no results (not all results).
2. Search for `_` → returns no results (not single-char matches).
3. Normal search terms still work correctly.
