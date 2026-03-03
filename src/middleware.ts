import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  // Not logged in: redirect to login
  if (!session) {
    return NextResponse.redirect(new URL("/login", nextUrl.origin));
  }

  // MFA pending: redirect to /mfa-verify (but don't loop if already there)
  if (
    session.user?.mfaPending &&
    !nextUrl.pathname.startsWith("/mfa-verify")
  ) {
    return NextResponse.redirect(new URL("/mfa-verify", nextUrl.origin));
  }

  // Authenticated and MFA complete: prevent visiting /mfa-verify
  if (
    !session.user?.mfaPending &&
    nextUrl.pathname.startsWith("/mfa-verify")
  ) {
    return NextResponse.redirect(new URL("/library", nextUrl.origin));
  }

  return NextResponse.next();
});

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
    "/mfa-verify",
  ],
};
