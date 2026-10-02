import { Router, Request, Response } from "express";
import multer from "multer";
import { ImageStore } from "../services/imageStore";
import { JobsRepository } from "../services/jobsRepository";
import { JobQueue } from "../services/jobQueue";
import { EnqueuedImportResult } from "../types";
import { asyncHandler } from "./asyncHandler";

export interface ImportsRouterDeps {
  repo: JobsRepository;
  imageStore: ImageStore;
  queue: JobQueue;
}

// Uploads are buffered in memory, so both of these are a hard cap on what
// one request can make the server hold. A full-quality phone photo is
// well under the per-file limit.
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGES_PER_REQUEST = 20;

export function createImportsRouter({ repo, imageStore, queue }: ImportsRouterDeps): Router {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: MAX_IMAGES_PER_REQUEST },
  });

  // Accepts one or more images and returns immediately with job IDs.
  // Each image is deduplicated against previously-seen images by content
  // hash before a new job is ever created.
  router.post(
    "/",
    upload.array("images"),
    asyncHandler(async (req: Request, res: Response) => {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];

      if (files.length === 0) {
        res.status(400).json({ error: "At least one image is required (field 'images')" });
        return;
      }

      const results: EnqueuedImportResult[] = [];

      for (const file of files) {
        const hash = ImageStore.hashOf(file.buffer);
        const existing = repo.findByHash(hash);

        if (existing) {
          if (existing.status === "failed") {
            // Re-uploading is the only way to retry a failed job — without
            // this, dedup would hand back the same dead job forever. The
            // image is re-written too, since a missing file is the most
            // likely reason processing failed in the first place.
            await imageStore.saveImage(file.buffer, existing.originalFilename);
            repo.updateStatus(existing.id, "queued");
            queue.enqueue(existing.id);
          }
          results.push({ id: existing.id, status: existing.status, duplicate: true });
          continue;
        }

        const { storedPath } = await imageStore.saveImage(file.buffer, file.originalname);
        const job = repo.create({
          imageHash: hash,
          originalFilename: file.originalname,
          storedPath,
        });
        queue.enqueue(job.id);

        results.push({ id: job.id, status: job.status, duplicate: false });
      }

      res.status(202).json({ jobs: results });
    })
  );

  // Job status is queryable by the client.
  router.get("/:id", (req: Request, res: Response) => {
    const job = repo.get(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.status(200).json(job);
  });

  return router;
}
