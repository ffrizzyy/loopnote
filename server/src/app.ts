import express, { Express, NextFunction, Request, Response } from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import { createImportsRouter } from "./routes/imports";
import { createReviewRouter } from "./routes/review";
import { createTopicsRouter } from "./routes/topics";
import { createStudyRouter } from "./routes/study";
import { createNotesRouter } from "./routes/notes";
import { createInvitesRouter } from "./routes/invites";
import { createWaitlistRouter } from "./routes/waitlist";
import { createFeedbackRouter } from "./routes/feedback";
import { createImportPipeline } from "./pipeline/processImportJob";
import { ImageStore } from "./services/imageStore";
import { JobQueue } from "./services/jobQueue";
import { JobsRepository } from "./services/jobsRepository";
import { UsageLog } from "./services/usageLog";
import { createDb } from "./db/client";
import { NotesRepository } from "./db/notesRepository";
import { TopicsRepository } from "./db/topicsRepository";
import { FlashcardsRepository } from "./db/flashcardsRepository";
import { UsersRepository } from "./db/usersRepository";
import { InvitesRepository } from "./db/invitesRepository";
import { WaitlistRepository } from "./db/waitlistRepository";
import { FeedbackRepository } from "./db/feedbackRepository";

export interface AppInstance {
  app: Express;
  repo: JobsRepository;
  imageStore: ImageStore;
  queue: JobQueue;
  usageLog: UsageLog;
  notesRepo: NotesRepository;
  topicsRepo: TopicsRepository;
  flashcardsRepo: FlashcardsRepository;
  usersRepo: UsersRepository;
  invitesRepo: InvitesRepository;
  waitlistRepo: WaitlistRepository;
  feedbackRepo: FeedbackRepository;
}

export function createApp(): AppInstance {
  const app = express();
  app.use(express.json());

  // Dev-only, permissive CORS: the review UI is a static page served from
  // a different origin/port than this API. Tighten this (allow-list a
  // specific origin) before any real deployment.
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  const repo = new JobsRepository();
  const usageLog = new UsageLog();
  const imagesDir = process.env.IMAGES_DIR ?? path.join(os.tmpdir(), "loopnote-images");
  const imageStore = new ImageStore(imagesDir);
  const queue = new JobQueue(repo, createImportPipeline({ repo, usageLog }));

  const db = createDb();
  const notesRepo = new NotesRepository(db);
  const topicsRepo = new TopicsRepository(db);
  const flashcardsRepo = new FlashcardsRepository(db);
  const usersRepo = new UsersRepository(db);
  const invitesRepo = new InvitesRepository(db);
  const waitlistRepo = new WaitlistRepository(db);
  const feedbackRepo = new FeedbackRepository(db);

  // Liveness/readiness check.
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/imports", createImportsRouter({ repo, imageStore, queue }));
  app.use("/review", createReviewRouter({ jobsRepo: repo, notesRepo, topicsRepo }));
  app.use("/topics", createTopicsRouter({ topicsRepo }));
  app.use("/study", createStudyRouter({ flashcardsRepo }));
  app.use("/notes", createNotesRouter({ notesRepo, topicsRepo }));
  app.use("/invites", createInvitesRouter({ invitesRepo, usersRepo }));
  app.use("/waitlist", createWaitlistRouter({ waitlistRepo }));
  app.use("/feedback", createFeedbackRouter({ feedbackRepo }));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Every client of this API parses JSON, so errors are JSON too — not
  // Express's default HTML page (which also prints a stack trace outside
  // production). Must be registered last, and must keep all four
  // parameters: the arity is how Express recognises an error handler.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: err.message });
      return;
    }
    // body-parser tags its own failures (malformed JSON, body too large)
    // with the 4xx status they deserve.
    const status = (err as { status?: unknown } | null)?.status;
    if (typeof status === "number" && status >= 400 && status < 500) {
      res.status(status).json({ error: err instanceof Error ? err.message : "Bad request" });
      return;
    }
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return {
    app,
    repo,
    imageStore,
    queue,
    usageLog,
    notesRepo,
    topicsRepo,
    flashcardsRepo,
    usersRepo,
    invitesRepo,
    waitlistRepo,
    feedbackRepo,
  };
}
