import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, organizations } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isMfaRequired } from "@/lib/auth/mfa";

export async function GET() {
  const results: Record<string, unknown> = {};

  // 1. Check if DB is reachable
  try {
    const allUsers = await db
      .select({ id: users.id, email: users.email, isActive: users.isActive, role: users.role })
      .from(users)
      .limit(10);
    results.dbConnected = true;
    results.userCount = allUsers.length;
    results.users = allUsers.map((u) => ({ email: u.email, isActive: u.isActive, role: u.role }));
  } catch (e: unknown) {
    results.dbConnected = false;
    results.dbError = e instanceof Error ? e.message : String(e);
    return NextResponse.json(results);
  }

  // 2. Check if superadmin exists and password works
  const email = "superadmin@peg.test";
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      results.superadminFound = false;
    } else {
      results.superadminFound = true;
      results.superadminActive = user.isActive;
      results.passwordHashPresent = !!user.passwordHash;
      results.passwordHashPrefix = user.passwordHash?.substring(0, 10) + "...";
      const valid = await bcrypt.compare("password123", user.passwordHash);
      results.passwordValid = valid;

      // 3. Simulate the full authorize flow (MFA check)
      try {
        const mfaNeeded = await isMfaRequired(user.id, user.tenantId);
        results.mfaNeeded = mfaNeeded;
      } catch (e: unknown) {
        results.mfaCheckError = e instanceof Error ? e.stack : String(e);
      }

      // 4. Check org exists
      try {
        const [org] = await db
          .select({ id: organizations.id, name: organizations.name, settings: organizations.settings })
          .from(organizations)
          .where(eq(organizations.id, user.tenantId))
          .limit(1);
        results.orgFound = !!org;
        results.orgName = org?.name;
        results.orgSettings = org?.settings;
      } catch (e: unknown) {
        results.orgCheckError = e instanceof Error ? e.stack : String(e);
      }
    }
  } catch (e: unknown) {
    results.authorizeError = e instanceof Error ? e.stack : String(e);
  }

  // 5. Check env vars
  results.authSecretSet = !!process.env.AUTH_SECRET;
  results.authSecretLength = process.env.AUTH_SECRET?.length;
  results.authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "(not set)";
  results.vercelUrl = process.env.VERCEL_URL || "(not set)";
  results.nodeEnv = process.env.NODE_ENV;

  // 6. Try the actual NextAuth signIn endpoint internally
  try {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    // First get CSRF token
    const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`, { cache: "no-store" });
    const csrfData = await csrfRes.json();
    results.csrfTokenOk = !!csrfData.csrfToken;

    // Try actual signIn POST
    const signInRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        email: "superadmin@peg.test",
        password: "password123",
      }),
      redirect: "manual",
    });
    results.signInStatus = signInRes.status;
    results.signInHeaders = Object.fromEntries(signInRes.headers.entries());
    results.signInLocation = signInRes.headers.get("location");

    // Check if the redirect indicates success or error
    const location = signInRes.headers.get("location") || "";
    results.signInSuccess = !location.includes("error");
    if (location.includes("error")) {
      results.signInErrorParam = new URL(location, baseUrl).searchParams.get("error");
    }
  } catch (e: unknown) {
    results.signInTestError = e instanceof Error ? e.stack : String(e);
  }

  return NextResponse.json(results, { headers: { "Content-Type": "application/json" } });
}
