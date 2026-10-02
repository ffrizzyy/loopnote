import Database from "better-sqlite3";
import { Flashcard } from "./types";
import { FlashcardRow, rowToFlashcard } from "./flashcardRow";
import { INITIAL_SCHEDULING_STATE, scheduleNext } from "../scheduling/sm2";

export class FlashcardsRepository {
  constructor(private readonly db: Database.Database) {}

  get(id: string): Flashcard | undefined {
    const row = this.db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(id) as FlashcardRow | undefined;
    return row ? rowToFlashcard(row) : undefined;
  }

  /** Cards due now or overdue, earliest-due first — "due today" flashcards
   * shown first in the review flow. Cards with no schedule yet (null
   * next_review_date — shouldn't happen for cards created via
   * NotesRepository, but is possible for data that predates this
   * feature) are excluded rather than treated as always-due. */
  listDue(now: Date = new Date()): Flashcard[] {
    const rows = this.db
      .prepare(`SELECT * FROM flashcards WHERE next_review_date IS NOT NULL AND next_review_date <= ? ORDER BY next_review_date ASC`)
      .all(now.toISOString()) as FlashcardRow[];
    return rows.map(rowToFlashcard);
  }

  /** Applies SM-2 based on a 0–5 recall-quality rating and persists the result. */
  recordReview(id: string, quality: number, now: Date = new Date()): Flashcard {
    const row = this.db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(id) as FlashcardRow | undefined;
    if (!row) {
      throw new Error(`No flashcard with id ${id}`);
    }

    const state = {
      repetitions: row.repetitions ?? INITIAL_SCHEDULING_STATE.repetitions,
      intervalDays: row.interval_days ?? INITIAL_SCHEDULING_STATE.intervalDays,
      easeFactor: row.ease_factor ?? INITIAL_SCHEDULING_STATE.easeFactor,
    };
    const result = scheduleNext(state, quality, now);

    this.db
      .prepare(
        `UPDATE flashcards SET next_review_date = ?, interval_days = ?, ease_factor = ?, repetitions = ?, updated_at = ? WHERE id = ?`
      )
      .run(result.nextReviewDate, result.intervalDays, result.easeFactor, result.repetitions, now.toISOString(), id);

    return this.get(id)!;
  }
}
