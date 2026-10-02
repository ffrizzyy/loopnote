import { Router, Request, Response } from "express";
import { unlink } from "node:fs/promises";
import { JobsRepository } from "../services/jobsRepository";
import { NotesRepository } from "../db/notesRepository";
import { TopicsRepository } from "../db/topicsRepository";
import { ImportJob } from "../types";
import { suggestTopic, TopicMatch } from "../categorization/matchTopic";
import { buildTopicSignatures } from "../categorization/topicSignatures";
import { asyncHandler } from "./asyncHandler";

export interface ReviewRouterDeps {
  jobsRepo: JobsRepository;
  notesRepo: NotesRepository;
  topicsRepo: TopicsRepository;
}

interface ReviewCard {
  jobId: string;
  extractedText: string;
  hasDiagram: boolean;
  flaggedForReview: boolean;
  summary: string | null;
  suggestedTopic: string | null;
  tags: string[];
  flashcards: Array<{ question: string; answer: string }>;
  /** A suggested *existing* topic to merge into, by tag similarity —
   * distinct from suggestedTopic above, which is just a name for a
   * possible *new* topic. Null when nothing clears the confidence
   * threshold; this is a suggestion only — the caller must still call
   * POST /:id/merge to act on it, so a bad suggestion never silently
   * groups anything on its own. */
  suggestedExistingTopic: TopicMatch | null;
}

function toReviewCard(job: ImportJob, suggestedExistingTopic: TopicMatch | null): ReviewCard {
  return {
    jobId: job.id,
    extractedText: job.detection?.extracted_text ?? "",
    hasDiagram: job.detection?.has_diagram ?? false,
    flaggedForReview: job.detection?.flaggedForReview ?? false,
    summary: job.summarization?.summary ?? null,
    suggestedTopic: job.summarization?.topic ?? null,
    tags: job.summarization?.tags ?? [],
    flashcards: job.summarization?.flashcards ?? [],
    suggestedExistingTopic,
  };
}

/** A job is review-worthy once processing has finished and it wasn't
 * confidently auto-filtered as a non-note: either it has a summarization
 * (confidently a note) or it was flagged as uncertain either way. */
function isReviewCandidate(job: ImportJob): boolean {
  if (job.status !== "done" || job.reviewedAt) return false;
  return job.summarization !== null || job.detection?.flaggedForReview === true;
}

export function createReviewRouter({ jobsRepo, notesRepo, topicsRepo }: ReviewRouterDeps): Router {
  const router = Router();

  // The stack of processed photos the user reviews one at a time.
  router.get("/pending", (_req: Request, res: Response) => {
    const signatures = buildTopicSignatures(topicsRepo, notesRepo);
    const cards = jobsRepo
      .all()
      .filter(isReviewCandidate)
      .map((job) => {
        const suggestion = suggestTopic(job.summarization?.tags ?? [], signatures);
        return toReviewCard(job, suggestion);
      });
    res.status(200).json({ items: cards });
  });

  // Accept: persist as a note, optionally under a named topic. The name
  // reuses an existing topic when one already has it — the review UI
  // pre-fills this field with a suggested name, so always creating would
  // pile up identically-named topics.
  router.post("/:id/keep", (req: Request, res: Response) => {
    const job = jobsRepo.get(req.params.id);
    if (!job || !isReviewCandidate(job)) {
      res.status(404).json({ error: "No pending review item with that id" });
      return;
    }

    const newTopicName = typeof req.body?.newTopicName === "string" ? req.body.newTopicName.trim() : "";
    const topicId = newTopicName
      ? (topicsRepo.findByName(newTopicName) ?? topicsRepo.create(newTopicName)).id
      : null;

    const created = notesRepo.createWithFlashcards({
      topicId,
      sourceImagePath: job.storedPath,
      extractedText: job.detection?.extracted_text ?? "",
      summary: job.summarization?.summary ?? "",
      tags: job.summarization?.tags ?? [],
      flashcards: job.summarization?.flashcards ?? [],
    });
    const note = notesRepo.setReviewStatus(created.id, "kept");

    jobsRepo.markReviewed(job.id);
    res.status(200).json({ note });
  });

  // Merge: persist as a note under an existing topic.
  router.post("/:id/merge", (req: Request, res: Response) => {
    const job = jobsRepo.get(req.params.id);
    if (!job || !isReviewCandidate(job)) {
      res.status(404).json({ error: "No pending review item with that id" });
      return;
    }

    const topicId = typeof req.body?.topicId === "string" ? req.body.topicId : "";
    if (!topicId || !topicsRepo.get(topicId)) {
      res.status(400).json({ error: "A valid existing topicId is required to merge" });
      return;
    }

    const created = notesRepo.createWithFlashcards({
      topicId,
      sourceImagePath: job.storedPath,
      extractedText: job.detection?.extracted_text ?? "",
      summary: job.summarization?.summary ?? "",
      tags: job.summarization?.tags ?? [],
      flashcards: job.summarization?.flashcards ?? [],
    });
    const note = notesRepo.setReviewStatus(created.id, "merged");

    jobsRepo.markReviewed(job.id);
    res.status(200).json({ note });
  });

  // Discard: actually delete the job and its stored image, not just hide it.
  router.post(
    "/:id/discard",
    asyncHandler(async (req: Request, res: Response) => {
      const job = jobsRepo.get(req.params.id);
      if (!job || !isReviewCandidate(job)) {
        res.status(404).json({ error: "No pending review item with that id" });
        return;
      }

      try {
        await unlink(job.storedPath);
      } catch {
        // Already gone or never wrote successfully — discarding should
        // still succeed; there's nothing left to clean up either way.
      }
      jobsRepo.remove(job.id);

      res.status(200).json({ discarded: true });
    })
  );

  return router;
}
