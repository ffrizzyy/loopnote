import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { runMigrations } from "./migrate";

/**
 * DATABASE_URL is a "file:<path>" URL, or the literal ":memory:" for
 * tests. Parsed by hand rather than pulling in a URL-parsing dependency —
 * it's one prefix check.
 */
function resolveFilePath(databaseUrl: string): string {
  if (databaseUrl === ":memory:") return databaseUrl;
  return databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
}

export function createDb(databaseUrl?: string): Database.Database {
  // Unset means ":memory:" — consistent with JobsRepository/ImageStore
  // defaulting to ephemeral storage, and critically avoids every
  // createApp() call (including in tests) sharing one file on disk. Real
  // persistence requires setting DATABASE_URL, per .env.example.
  const url = databaseUrl ?? process.env.DATABASE_URL ?? ":memory:";
  const filePath = resolveFilePath(url);

  if (filePath !== ":memory:") {
    const dir = path.dirname(filePath);
    if (dir && dir !== ".") mkdirSync(dir, { recursive: true });
  }

  const db = new Database(filePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}
