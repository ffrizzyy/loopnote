import { Router, Request, Response } from "express";
import { WaitlistRepository } from "../db/waitlistRepository";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function createWaitlistRouter({ waitlistRepo }: { waitlistRepo: WaitlistRepository }): Router {
  const router = Router();

  router.post("/", (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    // Length is checked first: EMAIL_RE backtracks quadratically, so it
    // must never run on an arbitrarily long string.
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }
    res.status(200).json({ entry: waitlistRepo.join(email) });
  });

  // Team-facing listing — same no-auth-yet caveat as invites.ts.
  router.get("/", (_req: Request, res: Response) => {
    res.status(200).json({ entries: waitlistRepo.list() });
  });

  return router;
}
