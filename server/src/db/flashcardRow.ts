import { Flashcard } from "./types";

export interface FlashcardRow {
  id: string;
  note_id: string;
  question: string;
  answer: string;
  next_review_date: string | null;
  interval_days: number | null;
  ease_factor: number | null;
  repetitions: number | null;
  created_at: string;
  updated_at: string;
}

export function rowToFlashcard(row: FlashcardRow): Flashcard {
  return {
    id: row.id,
    noteId: row.note_id,
    question: row.question,
    answer: row.answer,
    nextReviewDate: row.next_review_date,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    repetitions: row.repetitions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
