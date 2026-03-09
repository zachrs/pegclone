---
title: "[LOW] Add null check before ArrayBuffer type assertion"
labels: bug, low, code-quality
---

## Problem

`src/components/send/send-wizard.tsx:124` casts `e.target?.result` to `ArrayBuffer` without null checking:

```typescript
const data = new Uint8Array(e.target?.result as ArrayBuffer);
```

If `e.target` is null or `result` is null, this throws a runtime error.

## Fix

```typescript
reader.onload = (e) => {
  try {
    const result = e.target?.result;
    if (!result || typeof result === "string") {
      toast.error("Failed to read file");
      return;
    }
    const data = new Uint8Array(result);
    // ... rest of parsing logic
  } catch (error) {
    toast.error("Failed to parse file");
  }
};
```

## Verification

1. Normal file upload still works.
2. No runtime crash if FileReader returns null/string.
