export type ReviewStatus = "pending" | "kept" | "merged" | "discarded";

export interface Topic {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  noteId: string;
  question: string;
  answer: string;
  nextReviewDate: string | null;
  intervalDays: number | null;
  easeFactor: number | null;
  repetitions: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  topicId: string | null;
  sourceImagePath: string;
  extractedText: string;
  summary: string;
  tags: string[];
  reviewStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NoteWithFlashcards extends Note {
  flashcards: Flashcard[];
}

export interface CreateNoteInput {
  topicId?: string | null;
  sourceImagePath: string;
  extractedText: string;
  summary: string;
  tags: string[];
  flashcards: Array<{ question: string; answer: string }>;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface InviteCode {
  code: string;
  createdAt: string;
  redeemedByUserId: string | null;
  redeemedAt: string | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  createdAt: string;
  invited: boolean;
}

export type FeedbackTargetType = "job" | "note" | "flashcard";
export type FeedbackKind = "detection" | "summary" | "flashcard";

export interface FeedbackEntry {
  id: string;
  targetType: FeedbackTargetType;
  targetId: string;
  kind: FeedbackKind;
  reason: string | null;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}
