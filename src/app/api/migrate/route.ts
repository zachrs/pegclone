import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function POST() {
  const sql = neon(process.env.DATABASE_URL!);

  const results: Record<string, unknown> = {};

  try {
    // Add missing columns to users table
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ`;
    results.columnsAdded = true;
  } catch (e: unknown) {
    results.migrationError = e instanceof Error ? e.message : String(e);
  }

  // Verify columns exist now
  try {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    results.columns = cols.map((c: Record<string, unknown>) => c.column_name);
  } catch (e: unknown) {
    results.verifyError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(results);
}
