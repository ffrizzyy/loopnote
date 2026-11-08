import { createEnv, type EnvSource } from "@loopnote/config/env";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1).optional(),
    WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1_000).max(300_000).default(30_000),
  })
  .superRefine((value, context) => {
    // Development can start without a database, because the worker has no queues yet.
    // Production cannot: every job it will run needs a connection string, and a silent
    // fallback there would point at nothing.
    if (value.NODE_ENV === "production" && value.DATABASE_URL === undefined) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Required in production",
      });
    }
  });

export type WorkerEnv = z.output<typeof schema>;

/** The only place in apps/worker allowed to read process.env. */
export function loadEnv(source?: EnvSource): Readonly<WorkerEnv> {
  return createEnv(
    schema,
    source ?? {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      WORKER_HEARTBEAT_MS: process.env.WORKER_HEARTBEAT_MS,
    },
  );
}
