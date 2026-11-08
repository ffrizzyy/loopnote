import { createEnv, type EnvSource } from "@loopnote/config/env";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url().default("http://localhost:3000"),
});

export type WebEnv = z.output<typeof schema>;

let cached: Readonly<WebEnv> | undefined;

/**
 * The only place in apps/web allowed to read process.env. Every variable is named
 * here, so `pnpm env:check` can compare the list against .env.example.
 */
export function loadEnv(source?: EnvSource): Readonly<WebEnv> {
  if (source === undefined && cached !== undefined) return cached;

  const env = createEnv(
    schema,
    source ?? {
      NODE_ENV: process.env.NODE_ENV,
      APP_URL: process.env.APP_URL,
    },
  );

  if (source === undefined) cached = env;

  return env;
}
