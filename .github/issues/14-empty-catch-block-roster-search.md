---
title: "[HIGH] Handle roster search errors instead of swallowing them"
labels: bug, high, ux
---

## Problem

`src/components/send/send-wizard.tsx:83` uses `.catch(() => [])` which silently swallows all search errors. Users get no feedback when the roster search fails (network error, server error, etc.).

```typescript
const results = await searchRecipients(query).catch(() => []);
```

## Fix

```typescript
const results = await searchRecipients(query).catch((err) => {
  console.error("Recipient search failed:", err);
  toast.error("Search failed. Please try again.");
  return [];
});
```

Or better, use a try/catch with proper error state:

```typescript
try {
  const results = await searchRecipients(query);
  setSearchResults(results);
} catch {
  toast.error("Failed to search recipients");
  setSearchResults([]);
}
```

## Verification

1. Simulate a network failure during recipient search → toast error appears.
2. Search still works normally when the server is healthy.
