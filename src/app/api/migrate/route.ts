import { NextResponse } from "next/server";
import postgres from "postgres";

export async function POST() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    return NextResponse.json({ error: "No DATABASE_URL" }, { status: 500 });
  }

  const sql = postgres(connectionString);
  const results: Record<string, unknown> = {};

  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMPTZ`;
    results.columnsAdded = true;
  } catch (e: unknown) {
    results.migrationError = e instanceof Error ? e.message : String(e);
  }

  try {
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    results.columns = cols.map((c) => c.column_name);
  } catch (e: unknown) {
    results.verifyError = e instanceof Error ? e.message : String(e);
  }

  await sql.end();
  return NextResponse.json(results);
}
