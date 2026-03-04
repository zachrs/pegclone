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
    // Super admins land on platform page, others on library
    const home = session.user?.role === "super_admin" ? "/super-admin/orgs" : "/library";
    return NextResponse.redirect(new URL(home, nextUrl.origin));
  }

  // Fix #9: Page-level permission enforcement for admin routes
  const role = session.user?.role;
  const isAdmin = session.user?.isAdmin;

  // Super-admin routes: only super_admin role
  if (nextUrl.pathname.startsWith("/super-admin")) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/library", nextUrl.origin));
    }
  }

  // Admin routes: super_admin or isAdmin users
  if (nextUrl.pathname.startsWith("/admin")) {
    if (role !== "super_admin" && !isAdmin) {
      return NextResponse.redirect(new URL("/library", nextUrl.origin));
    }
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
