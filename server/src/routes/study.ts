import { Router, Request, Response } from "express";
import { FlashcardsRepository } from "../db/flashcardsRepository";

export function createStudyRouter({ flashcardsRepo }: { flashcardsRepo: FlashcardsRepository }): Router {
  const router = Router();

  // "Due today" flashcards, queryable and shown first (earliest-due first).
  router.get("/due", (_req: Request, res: Response) => {
    res.status(200).json({ flashcards: flashcardsRepo.listDue() });
  });

  router.post("/:id/review", (req: Request, res: Response) => {
    const quality = req.body?.quality;
    if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
      res.status(400).json({ error: "quality must be an integer from 0 to 5" });
      return;
    }

    const existing = flashcardsRepo.get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: "No flashcard with that id" });
      return;
    }

    const updated = flashcardsRepo.recordReview(req.params.id, quality);
    res.status(200).json({ flashcard: updated });
  });

  return router;
}
