import { Router, Request, Response } from "express";
import { TopicsRepository } from "../db/topicsRepository";

export function createTopicsRouter({ topicsRepo }: { topicsRepo: TopicsRepository }): Router {
  const router = Router();

  router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ topics: topicsRepo.list() });
  });

  return router;
}
