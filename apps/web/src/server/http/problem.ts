import {
  problemRegistry,
  ProblemSchema,
  PROBLEM_TYPE_BASE,
  type ProblemCode,
} from "@loopnote/schemas";
import { v7 as uuidv7 } from "uuid";

import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/**
 * The only way an API error leaves the app.
 *
 * `detail` is a fixed sentence, never user input and never an internal value.
 * The schema rejects a UUID-shaped detail and long text, so a route cannot leak
 * a row ID or a stack by accident. A new request id is generated per response.
 */
export function problem(
  c: Context,
  status: ContentfulStatusCode,
  code: ProblemCode,
  detail?: string,
): Response {
  // eslint-disable-next-line security/detect-object-injection -- code is a ProblemCode union
  const definition = problemRegistry[code];

  // The registry is append-only and one code maps to one status. A mismatch is a
  // developer error, so fail loudly in tests instead of emitting a response whose
  // status and code disagree.
  if (definition.status !== status) {
    throw new TypeError(
      `problem code ${code} requires status ${definition.status}, received ${status}`,
    );
  }

  const body = ProblemSchema.parse({
    type: `${PROBLEM_TYPE_BASE}/${code}`,
    title: definition.title,
    status,
    code,
    detail: detail ?? definition.detail,
    requestId: uuidv7(),
  });

  return c.body(JSON.stringify(body), status, {
    "cache-control": "no-store",
    "content-type": "application/problem+json",
  });
}
