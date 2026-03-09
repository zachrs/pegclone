# QA Issues — Full Code Audit

Generated via static code analysis (Playwright browser downloads blocked in sandbox).

---

## CRITICAL — Fix Immediately

### 1. Exposed Debug Login Endpoint
- **File:** `src/app/api/debug-login/route.ts:8-113`
- **Issue:** Unauthenticated GET endpoint reveals user list, superadmin email, password hash prefix, AUTH_SECRET length, DB connection status, and MFA config.
- **Risk:** Full information disclosure to any attacker who hits `/api/debug-login`.

### 2. Unprotected Seed Route
- **File:** `src/app/api/seed/route.ts:15-228`
- **Issue:** No auth check. Hardcoded password `password123` (line 46). Calling this endpoint resets the DB with known credentials.
- **Risk:** Data destruction + credential compromise if exposed in production.

### 3. MFA Bypass — Middleware Only Guards `/mfa-verify`
- **File:** `src/middleware.ts:14-19`
- **Issue:** When `mfaPending=true`, middleware redirects away from `/mfa-verify` revisit but does NOT block access to `/library`, `/admin`, `/dashboard`, etc.
- **Risk:** Users can skip MFA entirely by navigating directly to app routes.

### 4. Broken Base URL Construction
- **Files:** `src/lib/actions/admin.ts:111-113,179-181,962-964` · `src/lib/actions/auth.ts:300`
- **Issue:** Ternary logic is wrong — `NEXTAUTH_URL || VERCEL_URL ? https://VERCEL_URL : localhost` means if `NEXTAUTH_URL` is truthy it still falls through to check `VERCEL_URL`.
- **Risk:** Password-reset and invite links may point to `localhost` or wrong domain in production.

### 5. Webhook Signature Validation Fails Open
- **File:** `src/app/api/webhooks/mailgun/route.ts:18-36`
- **Issue:** If `MAILGUN_WEBHOOK_SIGNING_KEY` env var is missing in production, validation is silently skipped and the webhook is still processed.
- **Risk:** Malicious webhook payloads accepted as legitimate.

---

## HIGH — Address This Sprint

### 6. No Error Boundaries (20+ Routes)
- **Issue:** Only one `error.tsx` exists in the entire app (`src/app/m/[token]/error.tsx`). No root, dashboard, or admin error boundary.
- **Missing at:** `src/app/error.tsx`, `src/app/(dashboard)/error.tsx`, `src/app/(super-admin)/error.tsx`, all auth pages.
- **Risk:** Unhandled runtime errors show a blank white screen.

### 7. No `not-found.tsx` Anywhere
- **Issue:** No custom 404 page. Dynamic routes (`campaigns/[id]`, `super-admin/orgs/[orgId]`, `m/[token]`) render inline error JSX instead of calling `notFound()`.
- **Risk:** Inconsistent UX; no way back for users who hit a bad URL.

### 8. Missing Input Validation on Upload Route
- **File:** `src/app/api/upload/route.ts:27,38-44`
- **Issue:** `filename` parameter not validated for path traversal. File type check is extension-only (no MIME verification). No file-size limit before `arrayBuffer()`.
- **Risk:** Path traversal, malicious file upload, memory exhaustion.

### 9. SQL-like Injection in Search
- **Files:** `src/lib/actions/recipients.ts:33-35,106` · `src/lib/actions/library.ts:99`
- **Issue:** Uses string interpolation `${"%" + search + "%"}` in Drizzle `ilike()`. Special characters (`%`, `_`) are not escaped.
- **Risk:** Users can craft search terms that return unintended results.

### 10. Missing Rate Limiting on Public Viewer Routes
- **Files:** `src/app/api/viewer/event/route.ts` · `src/app/api/viewer/opt-out/route.ts` · `src/app/api/viewer/pdf/route.ts`
- **Issue:** No rate limiting, no body-size limit, no CORS headers.
- **Risk:** Abuse/DoS on public endpoints.

### 11. In-Memory Rate Limiter Won't Scale
- **File:** `src/app/api/auth/[...nextauth]/route.ts:8-28`
- **Issue:** Login rate limiter uses an in-memory `Map`. Lost on restart, not shared across instances.
- **Risk:** Ineffective brute-force protection in multi-instance deployments.

### 12. Unsafe `document.write()` for QR Code Print
- **Files:** `src/components/send/send-wizard.tsx:248-252` · `src/components/library/send-cart-bar.tsx:269-274`
- **Issue:** Opens a new window and calls `document.write()` with a template literal containing `qrDataUrl`. Deprecated and potential XSS vector.
- **Fix:** Use blob URL or iframe-based printing.

### 13. `window.location.href` Instead of Next.js Router
- **File:** `src/components/send/send-wizard.tsx:276,772`
- **Issue:** Hard navigation bypasses client-side routing, loses React state, and blocks cleanup.
- **Fix:** Use `useRouter().push()`.

### 14. Empty Catch Block Swallows Roster Search Errors
- **File:** `src/components/send/send-wizard.tsx:83`
- **Issue:** `.catch(() => {})` — users get no feedback when roster search fails.

### 15. Permission System Not Enforced in Actions
- **File:** `src/lib/auth/permissions.ts:38-60`
- **Issue:** `can()` and `requirePermission()` exist but are not called in admin server actions. If middleware is bypassed, no secondary check.

---

## MEDIUM — Plan for Next Cycle

### 16. No `loading.tsx` Files
- **Issue:** Zero `loading.tsx` files in the project. All pages use manual skeleton loaders via `useState`. Missing instant Suspense fallbacks during navigation.

### 17. Missing Page Metadata / SEO (20+ pages)
- **Issue:** Only root layout has `metadata`. All dashboard, admin, auth, and super-admin pages lack individual `title`/`description` exports.

### 18. Missing Security Headers
- **File:** `next.config.ts`
- **Issue:** No `Content-Security-Policy`, `Permissions-Policy`, or `X-Permitted-Cross-Domain-Policies` headers configured.

### 19. Beta Dependency in Production
- **File:** `package.json:41`
- **Issue:** `next-auth@5.0.0-beta.30` — beta version with potential breaking changes and unpatched vulnerabilities.

### 20. Dev Auth Fallback Bypasses Login
- **File:** `src/lib/actions/auth.ts:32-48`
- **Issue:** In `NODE_ENV=development`, `getSession()` auto-logs in the first active user. If staging accidentally runs with `NODE_ENV=development`, auth is bypassed.

### 21. Form Validation Missing User Feedback
- **File:** `src/components/library/add-content-dialog.tsx:92-93`
- **Issue:** `handleSubmit` silently returns if title/URL are empty — no toast or inline error shown.

### 22. `console.error()` in Production Code
- **File:** `src/components/library/add-content-dialog.tsx:104,227`
- **Issue:** Debug logging left in component code. Reveals internal error details in browser console.

### 23. FileReader Missing `onerror` Handler
- **Files:** `src/components/send/send-wizard.tsx:122-143` · `src/components/admin/bulk-invite-dialog.tsx:139-144`
- **Issue:** `FileReader.onload` is set but `onerror` is not — users get no feedback if file reading fails.

### 24. Inconsistent API Error Response Shapes
- **Issue:** Some routes return `{ error }`, others `{ received: true }`, others `{ success, error? }`. No standard error envelope.

### 25. Missing CSRF on State-Changing Public Endpoints
- **Files:** `src/app/api/viewer/opt-out/route.ts` · `src/app/api/viewer/event/route.ts`
- **Issue:** POST endpoints with no CSRF token validation. Token-gated but still vulnerable to cross-origin form submission.

### 26. Incomplete `.env.local.example`
- **Issue:** Missing: `ALGOLIA_SEARCH_API_KEY`, `ALGOLIA_INDEX_NAME`, `TWILIO_STATUS_CALLBACK_URL`, `MAILGUN_WEBHOOK_SIGNING_KEY`, `BLOB_READ_WRITE_TOKEN`.

### 27. Missing `images.domains` for Vercel Blob
- **File:** `next.config.ts`
- **Issue:** No remote image patterns configured for Vercel Blob URLs used by org logos and uploaded content.

---

## LOW — Backlog

### 28. Accessibility: Toggle Missing `aria-label`
- **File:** `src/app/(dashboard)/admin/reminders/page.tsx:60`

### 29. Index-Based `key` Props
- **Files:** `src/components/layout/header.tsx:21` · `src/components/admin/bulk-invite-dialog.tsx:231,351`
- **Issue:** Using array index as React key on dynamic lists.

### 30. Large Component (800 lines)
- **File:** `src/components/send/send-wizard.tsx` (799 lines)
- **Recommendation:** Extract Step 1–4 into separate sub-components.

### 31. Hardcoded Strings (i18n)
- **Issue:** 30+ UI strings hardcoded across components. No internationalization layer.

### 32. Phone Validation Regex Too Permissive
- **File:** `src/components/send/send-wizard.tsx:90`
- **Issue:** `/^\+?\d[\d\s()-]{6,}$/` accepts many non-phone strings.

### 33. QR Code Library Re-imported on Every Send
- **Files:** `src/components/send/send-wizard.tsx:171` · `src/components/library/send-cart-bar.tsx:205`
- **Issue:** `await import("qrcode")` called on each send. Should be cached.

### 34. Generic Error Messages
- **File:** `src/components/admin/bulk-invite-dialog.tsx:186-187`
- **Issue:** `"Failed to send invitations"` — no detail about which invites failed or why.

### 35. Unsafe Type Assertion
- **File:** `src/components/send/send-wizard.tsx:124`
- **Issue:** `new Uint8Array(e.target?.result as ArrayBuffer)` — no null check before cast.

---

## Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| **Critical** | 5 | Debug endpoint, seed route, MFA bypass, URL construction, webhook validation |
| **High** | 10 | Error boundaries, input validation, rate limiting, unsafe DOM, permissions |
| **Medium** | 12 | Loading states, SEO, security headers, form validation, env config |
| **Low** | 8 | a11y, i18n, code quality, component size |
| **Total** | **35** | |
