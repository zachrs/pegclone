import { handlers } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter for login attempts (HIPAA brute-force protection).
 * Tracks attempts per IP. Allows 5 attempts per 15-minute window.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

// Periodically clean up expired entries to prevent memory leak
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    for (const [ip, entry] of loginAttempts) {
      if (now > entry.resetAt) loginAttempts.delete(ip);
    }
  };
  setInterval(cleanup, 60_000);
}

export const { GET } = handlers;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Only rate-limit the credentials sign-in callback
  const isSignIn = req.nextUrl.pathname.includes("callback") &&
    req.nextUrl.pathname.includes("credentials");

  if (isSignIn && isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429 }
    );
  }

  return handlers.POST(req);
}
