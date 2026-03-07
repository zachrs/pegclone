---
title: "[LOW] Tighten phone number validation regex"
labels: bug, low
---

## Problem

`src/components/send/send-wizard.tsx:90` uses `/^\+?\d[\d\s()-]{6,}$/` which accepts many non-phone strings (e.g., `1------`, `1((((((`).

## Fix

The project already has `libphonenumber-js` as a dependency (package.json). Use it instead of regex:

```typescript
import { isValidPhoneNumber } from "libphonenumber-js";

// Replace regex check with:
if (!isValidPhoneNumber(phone, "US")) {
  // invalid phone
}
```

Or for a simple regex improvement:

```typescript
/^\+?[1-9]\d{1,14}$/  // E.164-like format
```

## Verification

1. Valid US numbers (+15551234567) pass validation.
2. Invalid strings (1------, abc) fail validation.
3. International numbers with country code pass.
