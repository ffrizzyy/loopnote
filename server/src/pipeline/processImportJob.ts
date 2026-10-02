import { readFile } from "node:fs/promises";
import { resizeForDetection } from "./imagePreprocessing";
import { mockDetect } from "./detection";
import { mockSummarize } from "./summarization";
import { ImportJob } from "../types";
import { JobsRepository } from "../services/jobsRepository";
import { UsageLog } from "../services/usageLog";
import { JobProcessor } from "../services/jobQueue";

// Below this, we trust neither an is_note: true nor an is_note: false
// verdict — the image is flagged for a human to look at instead of being
// silently auto-accepted or auto-discarded.
export const CONFIDENCE_THRESHOLD = 0.6;

export interface ImportPipelineDeps {
  repo: JobsRepository;
  usageLog: UsageLog;
}

/**
 * Real implementations of detect() and summarize() should call the
 * Anthropic Batch API rather than real-time, per "Implement summarization
 * + flashcard generation call" — mocked calls here have no such cost
 * concern, but the two-stage shape (detect, then conditionally summarize)
 * is written so a batch client slots in at either call site later.
 */
export function createImportPipeline({ repo, usageLog }: ImportPipelineDeps): JobProcessor {
  return async function processImportJob(job: ImportJob): Promise<void> {
    const original = await readFile(job.storedPath);
    const { buffer: preprocessed } = await resizeForDetection(original);

    const result = await mockDetect(preprocessed, job.originalFilename);

    usageLog.record({
      jobId: job.id,
      stage: "detection",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const flaggedForReview = result.confidence < CONFIDENCE_THRESHOLD;

    repo.attachDetection(job.id, {
      is_note: result.is_note,
      confidence: result.confidence,
      extracted_text: result.extracted_text,
      has_diagram: result.has_diagram,
      flaggedForReview,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    const shouldProceedToSummarization = result.is_note && !flaggedForReview;
    if (!shouldProceedToSummarization) {
      // Confidently not a note (filtered out) or genuinely uncertain
      // (flagged for review) — either way, summarization never runs on it.
      return;
    }

    const summary = await mockSummarize(result.extracted_text, job.originalFilename);

    usageLog.record({
      jobId: job.id,
      stage: "summarization",
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
    });

    repo.attachSummarization(job.id, {
      topic: summary.topic,
      summary: summary.summary,
      tags: summary.tags,
      flashcards: summary.flashcards,
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
    });
  };
}
