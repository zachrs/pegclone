---
title: "[MEDIUM] Show validation errors when add-content form fields are empty"
labels: bug, ux, medium
---

## Problem

`src/components/library/add-content-dialog.tsx:92–93` — `handleSubmit` silently returns when title or URL are empty. No toast, no inline error, no visual feedback.

```typescript
if (!title.trim() || !url.trim()) {
  return;  // ← silent failure
}
```

## Fix

```typescript
if (!title.trim() || !url.trim()) {
  if (!title.trim()) toast.error("Title is required");
  else toast.error("URL is required");
  return;
}
```

Or better, use form validation state with inline errors:

```typescript
const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

const handleSubmit = async () => {
  const newErrors: typeof errors = {};
  if (!title.trim()) newErrors.title = "Title is required";
  if (!url.trim()) newErrors.url = "URL is required";

  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }
  setErrors({});
  // ... proceed
};
```

## Verification

1. Click "Add" with empty title → error message shown.
2. Click "Add" with empty URL → error message shown.
3. Fill both fields → submits normally.
