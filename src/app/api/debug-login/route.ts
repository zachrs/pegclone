import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

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
  try {
    const [user] = await db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash, isActive: users.isActive })
      .from(users)
      .where(eq(users.email, "superadmin@peg.test"))
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
    }
  } catch (e: unknown) {
    results.passwordCheckError = e instanceof Error ? e.message : String(e);
  }

  // 3. Check AUTH_SECRET
  results.authSecretSet = !!process.env.AUTH_SECRET;
  results.authUrlSet = !!process.env.AUTH_URL || !!process.env.NEXTAUTH_URL;

  return NextResponse.json(results, { headers: { "Content-Type": "application/json" } });
}
