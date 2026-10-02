export type JobStatus = "queued" | "processing" | "done" | "failed";

/**
 * Fields named exactly as the (future, currently mocked) vision-LLM call's
 * response schema, per the "Implement detection + OCR call" issue.
 */
export interface DetectionSchema {
  is_note: boolean;
  confidence: number;
  extracted_text: string;
  has_diagram: boolean;
}

export interface DetectionRecord extends DetectionSchema {
  /** True when confidence fell below the review threshold — the pipeline
   * neither auto-accepted nor auto-discarded this image. */
  flaggedForReview: boolean;
  inputTokens: number;
  outputTokens: number;
}

export interface Flashcard {
  question: string;
  answer: string;
}

/**
 * Fields named exactly as the (future, currently mocked) summarization
 * call's response schema, per "Implement summarization + flashcard
 * generation call".
 */
export interface SummarizationSchema {
  topic: string;
  summary: string;
  tags: string[];
  flashcards: Flashcard[];
}

export interface SummarizationRecord extends SummarizationSchema {
  inputTokens: number;
  outputTokens: number;
}

export interface ImportJob {
  id: string;
  imageHash: string;
  originalFilename: string;
  storedPath: string;
  status: JobStatus;
  error: string | null;
  detection: DetectionRecord | null;
  summarization: SummarizationRecord | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueuedImportResult {
  id: string;
  status: JobStatus;
  duplicate: boolean;
}
