import { handlers } from "@/lib/auth";
import { db } from "@/lib/db";
import { loginAttempts } from "@/drizzle/schema";
import { and, gte, sql, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

/**
 * Database-backed rate limiter for login attempts (HIPAA brute-force protection).
 * Tracks attempts per IP in Postgres. Allows 5 attempts per 15-minute window.
 * Persists across server restarts / serverless cold starts.
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 5;

async function isRateLimited(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MS);

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ipAddress, ip),
        gte(loginAttempts.attemptedAt, windowStart)
      )
    );

  return (result?.count ?? 0) >= LOGIN_MAX_ATTEMPTS;
}

async function recordAttempt(ip: string): Promise<void> {
  await db.insert(loginAttempts).values({ ipAddress: ip });
}

export const { GET } = handlers;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  // Only rate-limit the credentials sign-in callback
  const isSignIn =
    req.nextUrl.pathname.includes("callback") &&
    req.nextUrl.pathname.includes("credentials");

  if (isSignIn) {
    if (await isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  const response = await handlers.POST(req);

  // Only record failed sign-in attempts (successful logins shouldn't count
  // toward the rate limit, otherwise normal usage could trigger lockout)
  if (isSignIn && response) {
    const url = new URL(response.headers.get("location") ?? "", req.url);
    const hasError = url.searchParams.has("error");
    if (hasError) {
      await recordAttempt(ip);
    }
  }

  return response;
}
