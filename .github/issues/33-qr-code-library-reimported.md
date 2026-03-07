---
title: "[LOW] Cache QR code library dynamic import"
labels: enhancement, low, performance
---

## Problem

`src/components/send/send-wizard.tsx:171` and `src/components/library/send-cart-bar.tsx:205` call `await import("qrcode")` on every send. While browsers cache modules, the `import()` overhead adds unnecessary async latency.

## Fix

Cache the import result:

```typescript
let qrcodeModule: typeof import("qrcode") | null = null;

const getQRCode = async () => {
  if (!qrcodeModule) {
    qrcodeModule = await import("qrcode");
  }
  return qrcodeModule;
};

const generateQRCode = async (url: string): Promise<string> => {
  const QRCode = await getQRCode();
  return QRCode.toDataURL(url, { width: 200, margin: 2 });
};
```

Or extract as a shared utility used by both components.

## Verification

1. First send: QR code library loads dynamically.
2. Subsequent sends: No additional import overhead.
