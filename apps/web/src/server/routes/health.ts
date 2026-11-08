import { Hono } from "hono";

import packageJson from "../../../package.json";

/**
 * Liveness only. It says the process is up and which build it is; it does not
 * touch the database or any provider, so a dependency outage cannot make the
 * platform restart a healthy process.
 */
export const health = new Hono().get("/health", (c) =>
  c.json({ status: "ok", version: packageJson.version }, 200, {
    "cache-control": "no-store",
  }),
);
