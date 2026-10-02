import { Router, Request, Response } from "express";
import { FeedbackRepository } from "../db/feedbackRepository";
import { FeedbackKind, FeedbackTargetType } from "../db/types";

const TARGET_TYPES: FeedbackTargetType[] = ["job", "note", "flashcard"];
const KINDS: FeedbackKind[] = ["detection", "summary", "flashcard"];

export function createFeedbackRouter({ feedbackRepo }: { feedbackRepo: FeedbackRepository }): Router {
  const router = Router();

  // "In-app way to flag a bad detection, bad summary, or bad flashcard."
  router.post("/", (req: Request, res: Response) => {
    const targetType = req.body?.targetType;
    const targetId = req.body?.targetId;
    const kind = req.body?.kind;
    const reason = typeof req.body?.reason === "string" ? req.body.reason : null;

    if (!TARGET_TYPES.includes(targetType) || typeof targetId !== "string" || !targetId) {
      res.status(400).json({ error: `targetType must be one of ${TARGET_TYPES.join(", ")}, with a targetId` });
      return;
    }
    if (!KINDS.includes(kind)) {
      res.status(400).json({ error: `kind must be one of ${KINDS.join(", ")}` });
      return;
    }

    const entry = feedbackRepo.create({ targetType, targetId, kind, reason });
    res.status(201).json({ feedback: entry });
  });

  // "Flagged items are reviewable by the team, not just logged and
  // forgotten" — unresolved-first ordering by default (see
  // FeedbackRepository.list) so this is a real backlog, not an archive.
  router.get("/", (req: Request, res: Response) => {
    const resolvedParam = req.query.resolved;
    const filter =
      resolvedParam === "true" ? { resolved: true } : resolvedParam === "false" ? { resolved: false } : {};
    res.status(200).json({ feedback: feedbackRepo.list(filter) });
  });

  router.patch("/:id/resolve", (req: Request, res: Response) => {
    try {
      const entry = feedbackRepo.resolve(req.params.id);
      res.status(200).json({ feedback: entry });
    } catch {
      res.status(404).json({ error: "No feedback entry with that id" });
    }
  });

  return router;
}
