import { PgBoss } from "pg-boss";
import { registerWorkers } from "./workers";

let boss: PgBoss | null = null;
let workersRegistered = false;

/**
 * Get the singleton pg-boss instance. Lazily initializes on first call.
 * Also registers job workers on first start.
 */
export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const connectionString =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required for job queue");
  }

  boss = new PgBoss({
    connectionString,
    schema: "pgboss",
  });

  boss.on("error", (err: Error) => {
    console.error("[pg-boss] Error:", err);
  });

  await boss.start();

  // Register workers so queued jobs actually get processed
  if (!workersRegistered) {
    await registerWorkers(boss);
    workersRegistered = true;
    console.log("[pg-boss] Workers registered");
  }

  return boss;
}

/**
 * Stop the queue gracefully (for process shutdown).
 */
export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true, timeout: 10_000 });
    boss = null;
  }
}
