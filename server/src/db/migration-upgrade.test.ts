import Database from "better-sqlite3";
import { runMigrations } from "./migrate";

describe("runMigrations against a pre-existing database", () => {
  it("adds spaced-repetition columns to a flashcards table that predates them, without dropping existing rows", () => {
    const db = new Database(":memory:");

    // Simulates the table shape from before spaced-repetition scheduling
    // existed — no next_review_date / interval_days / ease_factor /
    // repetitions columns.
    db.exec(`
      CREATE TABLE topics (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE notes (
        id TEXT PRIMARY KEY, topic_id TEXT, source_image_path TEXT NOT NULL, extracted_text TEXT NOT NULL,
        summary TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]', review_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE flashcards (
        id TEXT PRIMARY KEY, note_id TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      INSERT INTO notes (id, source_image_path, extracted_text, summary, created_at, updated_at)
        VALUES ('note-1', '/x.jpg', 'text', 'summary', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
      INSERT INTO flashcards (id, note_id, question, answer, created_at, updated_at)
        VALUES ('card-1', 'note-1', 'Q?', 'A.', '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z');
    `);

    runMigrations(db);

    const columns = (db.prepare(`PRAGMA table_info(flashcards)`).all() as Array<{ name: string }>).map(
      (c) => c.name
    );
    expect(columns).toEqual(
      expect.arrayContaining(["next_review_date", "interval_days", "ease_factor", "repetitions"])
    );

    // The pre-existing row survived, with the new columns simply null.
    const row = db.prepare(`SELECT * FROM flashcards WHERE id = 'card-1'`).get() as Record<string, unknown>;
    expect(row.question).toBe("Q?");
    expect(row.next_review_date).toBeNull();

    // Running migrations again (as happens on every app startup) doesn't
    // error on "duplicate column name".
    expect(() => runMigrations(db)).not.toThrow();

    db.close();
  });
});
