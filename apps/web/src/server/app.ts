import { Hono } from "hono";

import { problem } from "./http/problem";
import { health } from "./routes/health";

/**
 * Builds the API. A factory keeps the app testable: a test can add a route that
 * throws and exercise the real error handler without shipping that route.
 */
export function createApp(): Hono {
  const app = new Hono().basePath("/api/v1");

  app.route("/", health);

  // Every unknown path, including one outside /api/v1, leaves as the same
  // problem shape. Nothing falls through to a framework default.
  app.notFound((c) => problem(c, 404, "not_found"));

  // The error object never reaches the response. A message, a stack, or a row ID
  // in an error is exactly what the security invariants forbid.
  app.onError((_error, c) => problem(c, 500, "internal_error"));

  return app;
}

export const app = createApp();
