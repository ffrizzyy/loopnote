import { Router, Request, Response } from "express";
import { InvitesRepository } from "../db/invitesRepository";
import { UsersRepository } from "../db/usersRepository";

export interface InvitesRouterDeps {
  invitesRepo: InvitesRepository;
  usersRepo: UsersRepository;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function createInvitesRouter({ invitesRepo, usersRepo }: InvitesRouterDeps): Router {
  const router = Router();

  // Generates invite codes. Deliberately unauthenticated — there's no
  // admin auth in this app yet. Fine for a small trusted beta cohort
  // where whoever runs the server also generates the codes; gate this
  // behind real auth before it's exposed beyond that.
  router.post("/", (req: Request, res: Response) => {
    // Only an omitted count defaults to 1 — a present-but-invalid one
    // (e.g. "5" as a string) is an error, not a silent fallback.
    const count = req.body?.count ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > 100) {
      res.status(400).json({ error: "count must be an integer between 1 and 100" });
      return;
    }
    res.status(201).json({ codes: invitesRepo.generate(count) });
  });

  router.post("/redeem", (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

    // Length is checked first: EMAIL_RE backtracks quadratically, so it
    // must never run on an arbitrarily long string.
    if (!code || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: "code and a valid email are required" });
      return;
    }

    const invite = invitesRepo.find(code);
    if (!invite) {
      res.status(404).json({ error: "Invite code not found" });
      return;
    }
    if (invite.redeemedByUserId) {
      res.status(409).json({ error: "Invite code was already redeemed" });
      return;
    }

    const user = usersRepo.getOrCreate(email);
    invitesRepo.redeem(code, user.id);
    res.status(200).json({ user });
  });

  return router;
}
