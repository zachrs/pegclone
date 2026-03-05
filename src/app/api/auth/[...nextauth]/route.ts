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
    // Lazy cleanup: remove a few expired entries on each check
    if (loginAttempts.size > 100) {
      for (const [key, val] of loginAttempts) {
        if (now > val.resetAt) loginAttempts.delete(key);
      }
    }
    return false;
  }

  entry.count++;
  return entry.count > LOGIN_MAX_ATTEMPTS;
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
