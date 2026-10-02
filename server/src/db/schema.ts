// Idempotent: every statement is safe to re-run, so this doubles as both
// the schema definition and the (only, for now) migration.
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- topic_id is nullable and updatable: a note can exist unassigned, and
-- "notes can be re-assigned between topics" is just an UPDATE on this
-- column (see NotesRepository.reassignTopic).
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
  source_image_path TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  -- JSON-encoded string[]. Tags don't need their own table yet — nothing
  -- in the current or near-term roadmap queries "notes by tag" at a scale
  -- where that matters, and this stays a one-line additive change
  -- (a normalized tags/note_tags pair) if that ever changes.
  tags TEXT NOT NULL DEFAULT '[]',
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'kept', 'merged', 'discarded')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_topic_id ON notes(topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_review_status ON notes(review_status);

-- One row per flashcard, not a JSON blob on notes — this is the design
-- choice that lets "Add spaced-repetition scheduling" (Phase 1) add
-- next_review_date / interval_days / ease_factor / repetitions as plain
-- nullable columns, as it now does below, without restructuring
-- anything else: each card carries its own schedule independently.
CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  -- Nullable: a flashcard that predates this feature (or was never
  -- scheduled for some other reason) just doesn't show up as "due" —
  -- see FlashcardsRepository.listDue's IS NOT NULL check — rather than
  -- needing a backfill before this feature could ship.
  next_review_date TEXT,
  interval_days INTEGER,
  ease_factor REAL,
  repetitions INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flashcards_note_id ON flashcards(note_id);

-- Minimal identity, added for the beta invite flow — no auth/passwords
-- yet, just enough to redeem an invite code into something durable and
-- to key per-user analytics on later.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invite_codes (
  code TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  redeemed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  redeemed_at TEXT
);

CREATE TABLE IF NOT EXISTS waitlist_entries (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  invited INTEGER NOT NULL DEFAULT 0
);

-- "In-app way to flag a bad detection, bad summary, or bad flashcard" —
-- one table for all three, distinguished by kind. target_type lets a
-- flag point at an in-flight job (flagged during review, before a note
-- even exists) as well as a persisted note or flashcard.
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('job', 'note', 'flashcard')),
  target_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('detection', 'summary', 'flashcard')),
  reason TEXT,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_resolved ON feedback(resolved);
`;
