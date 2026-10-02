import { Router, Request, Response } from "express";
import { NotesRepository } from "../db/notesRepository";
import { TopicsRepository } from "../db/topicsRepository";

export interface NotesRouterDeps {
  notesRepo: NotesRepository;
  topicsRepo: TopicsRepository;
}

export function createNotesRouter({ notesRepo, topicsRepo }: NotesRouterDeps): Router {
  const router = Router();

  // "User can override an automatic grouping" — not just at the moment of
  // merge, but any time after: reassign or unassign (topicId: null).
  router.patch("/:id/topic", (req: Request, res: Response) => {
    const topicId = req.body?.topicId;
    if (topicId !== null && typeof topicId !== "string") {
      res.status(400).json({ error: "topicId must be a string or null" });
      return;
    }
    if (topicId !== null && !topicsRepo.get(topicId)) {
      res.status(400).json({ error: "No topic with that id" });
      return;
    }

    try {
      const note = notesRepo.reassignTopic(req.params.id, topicId);
      res.status(200).json({ note });
    } catch {
      res.status(404).json({ error: "No note with that id" });
    }
  });

  return router;
}
