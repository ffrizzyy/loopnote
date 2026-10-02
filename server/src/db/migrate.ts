import Database from "better-sqlite3";
import { SCHEMA_SQL } from "./schema";

/** Adds a column if a pre-existing table doesn't already have it. SQLite
 * has no "ADD COLUMN IF NOT EXISTS", so this checks PRAGMA table_info
 * first — safe to call on every startup, whether the table is brand new
 * (already has the column via SCHEMA_SQL) or predates this migration. */
function ensureColumn(db: Database.Database, table: string, column: string, ddl: string): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  const exists = columns.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

export function runMigrations(db: Database.Database): void {
  db.exec(SCHEMA_SQL);

  // Demonstrates the exact promise made in schema.ts's comment: a
  // pre-existing flashcards table (created before spaced-repetition
  // scheduling existed) gets these columns added additively here,
  // rather than needing a rewrite.
  ensureColumn(db, "flashcards", "next_review_date", "next_review_date TEXT");
  ensureColumn(db, "flashcards", "interval_days", "interval_days INTEGER");
  ensureColumn(db, "flashcards", "ease_factor", "ease_factor REAL");
  ensureColumn(db, "flashcards", "repetitions", "repetitions INTEGER");

  // Must come after the ensureColumn calls above — indexing a column
  // that doesn't exist yet on a pre-existing table would fail before
  // ensureColumn ever got a chance to add it.
  db.exec(`CREATE INDEX IF NOT EXISTS idx_flashcards_next_review_date ON flashcards(next_review_date)`);
}
