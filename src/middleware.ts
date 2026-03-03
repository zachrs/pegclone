export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Protect all dashboard and admin routes.
     * Exclude:
     * - /m/[token] (patient viewer — public, token-gated)
     * - /api/auth (next-auth handlers)
     * - /api/webhooks (Twilio/Mailgun callbacks)
     * - /api/viewer (PDF proxy — token-gated, not session-gated)
     * - /login, /auth-error (auth pages)
     * - Static files (_next, favicon, etc.)
     */
    "/(dashboard)(.*)",
    "/(super-admin)(.*)",
  ],
};
