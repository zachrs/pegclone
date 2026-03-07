---
title: "[HIGH] Replace document.write() with safe print method for QR codes"
labels: security, high, bug
---

## Problem

Two components open a new window and use `document.write()` with template literals containing user data (`recipientName`):

- `src/components/send/send-wizard.tsx:248–275`
- `src/components/library/send-cart-bar.tsx:269–274`

`document.write()` is deprecated and the `recipientName` is inserted without HTML escaping, creating an XSS vector if a recipient name contains `<script>` tags.

## Fix

Replace with a blob URL approach:

```typescript
const printQRCodes = (results: Array<{ qrDataUrl: string; recipientName: string }>) => {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const html = `
    <html>
      <head><title>QR Codes</title></head>
      <body style="text-align: center; padding: 20px;">
        <h2>Scan QR Codes to View Content</h2>
        ${results
          .filter((r) => r.qrDataUrl)
          .map(
            (r) => `
            <div style="margin: 20px; page-break-inside: avoid;">
              <img src="${r.qrDataUrl}" alt="QR Code" />
              <p>${escapeHtml(r.recipientName)}</p>
            </div>
          `
          )
          .join("")}
      </body>
    </html>
  `;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
      URL.revokeObjectURL(url);
    };
  }
};
```

Extract as a shared utility in `src/lib/utils/print.ts` and use from both components.

## Verification

1. Send content to a recipient with name `<script>alert(1)</script>` → name renders as text, no alert.
2. QR code print dialog still opens and prints correctly.
