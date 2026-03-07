---
title: "[LOW] Decompose send-wizard.tsx into step sub-components"
labels: enhancement, low, code-quality
---

## Problem

`src/components/send/send-wizard.tsx` is 799 lines — a single component handling 4 wizard steps, file parsing, QR generation, and printing. This makes it difficult to maintain, test, and review.

## Suggested Decomposition

```
src/components/send/
├── send-wizard.tsx          (orchestrator, ~100 lines)
├── steps/
│   ├── select-recipients.tsx   (Step 1: search + file import)
│   ├── select-content.tsx      (Step 2: content selection)
│   ├── review-send.tsx         (Step 3: review + confirm)
│   └── send-confirmation.tsx   (Step 4: results + QR codes)
├── hooks/
│   └── use-send-wizard.ts      (shared state + handlers)
└── utils/
    └── roster-parser.ts        (XLSX/CSV parsing logic)
```

## Verification

1. Send wizard still works end-to-end after refactor.
2. Each step component is independently readable.
3. No regressions in QR code generation or printing.
