import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { CreateNoteInput, Note, NoteWithFlashcards, ReviewStatus } from "./types";
import { FlashcardRow, rowToFlashcard } from "./flashcardRow";
import { INITIAL_SCHEDULING_STATE } from "../scheduling/sm2";

interface NoteRow {
  id: string;
  topic_id: string | null;
  source_image_path: string;
  extracted_text: string;
  summary: string;
  tags: string;
  review_status: ReviewStatus;
  created_at: string;
  updated_at: string;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    topicId: row.topic_id,
    sourceImagePath: row.source_image_path,
    extractedText: row.extracted_text,
    summary: row.summary,
    tags: JSON.parse(row.tags) as string[],
    reviewStatus: row.review_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class NotesRepository {
  constructor(private readonly db: Database.Database) {}

  /** Creates a note and its flashcards atomically — either both persist or neither does.
   * New flashcards are scheduled as due immediately (see INITIAL_SCHEDULING_STATE /
   * scheduleNext), so they show up in the first "due today" study session. */
  createWithFlashcards(input: CreateNoteInput): NoteWithFlashcards {
    const now = new Date().toISOString();
    const noteId = randomUUID();

    const insertNote = this.db.prepare(
      `INSERT INTO notes (id, topic_id, source_image_path, extracted_text, summary, tags, review_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    );
    const insertFlashcard = this.db.prepare(
      `INSERT INTO flashcards (id, note_id, question, answer, next_review_date, interval_days, ease_factor, repetitions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const run = this.db.transaction(() => {
      insertNote.run(
        noteId,
        input.topicId ?? null,
        input.sourceImagePath,
        input.extractedText,
        input.summary,
        JSON.stringify(input.tags),
        now,
        now
      );
      for (const card of input.flashcards) {
        insertFlashcard.run(
          randomUUID(),
          noteId,
          card.question,
          card.answer,
          now, // due immediately
          INITIAL_SCHEDULING_STATE.intervalDays,
          INITIAL_SCHEDULING_STATE.easeFactor,
          INITIAL_SCHEDULING_STATE.repetitions,
          now,
          now
        );
      }
    });
    run();

    return this.get(noteId)!;
  }

  get(id: string): NoteWithFlashcards | undefined {
    const noteRow = this.db.prepare(`SELECT * FROM notes WHERE id = ?`).get(id) as NoteRow | undefined;
    if (!noteRow) return undefined;

    const cardRows = this.db
      .prepare(`SELECT * FROM flashcards WHERE note_id = ? ORDER BY created_at ASC`)
      .all(id) as FlashcardRow[];

    return { ...rowToNote(noteRow), flashcards: cardRows.map(rowToFlashcard) };
  }

  /** "Notes can be re-assigned between topics" — pass null to unassign. */
  reassignTopic(noteId: string, topicId: string | null): NoteWithFlashcards {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(`UPDATE notes SET topic_id = ?, updated_at = ? WHERE id = ?`)
      .run(topicId, now, noteId);
    if (result.changes === 0) {
      throw new Error(`No note with id ${noteId}`);
    }
    return this.get(noteId)!;
  }

  setReviewStatus(noteId: string, status: ReviewStatus): NoteWithFlashcards {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(`UPDATE notes SET review_status = ?, updated_at = ? WHERE id = ?`)
      .run(status, now, noteId);
    if (result.changes === 0) {
      throw new Error(`No note with id ${noteId}`);
    }
    return this.get(noteId)!;
  }

  /** Hard delete — discarded notes are actually removed, not just hidden. Cascades to flashcards. */
  remove(noteId: string): void {
    this.db.prepare(`DELETE FROM notes WHERE id = ?`).run(noteId);
  }

  listByTopic(topicId: string): NoteWithFlashcards[] {
    const rows = this.db
      .prepare(`SELECT id FROM notes WHERE topic_id = ? ORDER BY created_at ASC`)
      .all(topicId) as Array<{ id: string }>;
    return rows.map((r) => this.get(r.id)!);
  }

  listPending(): NoteWithFlashcards[] {
    const rows = this.db
      .prepare(`SELECT id FROM notes WHERE review_status = 'pending' ORDER BY created_at ASC`)
      .all() as Array<{ id: string }>;
    return rows.map((r) => this.get(r.id)!);
  }
}
