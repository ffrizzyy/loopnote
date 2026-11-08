import {
  problemRegistry,
  ProblemSchema,
  PROBLEM_TYPE_BASE,
  type ProblemCode,
} from "@loopnote/schemas";
import { Hono, type Context } from "hono";
import { describe, expect, it } from "vitest";

import { problem } from "./problem";

import type { ContentfulStatusCode } from "hono/utils/http-status";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CASES = [
  { status: 400, code: "bad_request" },
  { status: 404, code: "note_not_found" },
  { status: 429, code: "rate_limited" },
  { status: 500, code: "internal_error" },
] as const satisfies ReadonlyArray<{
  status: ContentfulStatusCode;
  code: ProblemCode;
}>;

describe("problem", () => {
  it.each(CASES)("renders $status $code as problem+json", async ({ status, code }) => {
    const response = await appFor(status, code).request("/");

    expect(response.status).toBe(status);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(response.headers.get("cache-control")).toBe("no-store");

    const body: unknown = await response.json();
    const parsed = ProblemSchema.parse(body);
    // eslint-disable-next-line security/detect-object-injection -- code is a ProblemCode union
    const definition = problemRegistry[code];

    expect(parsed).toMatchObject({
      type: `${PROBLEM_TYPE_BASE}/${code}`,
      title: definition.title,
      status,
      code,
      detail: definition.detail,
    });
    expect(parsed.requestId).toMatch(UUID_V7);
    expect(body).not.toHaveProperty("stack");
    expect(Object.keys(parsed).sort()).toEqual([
      "code",
      "detail",
      "requestId",
      "status",
      "title",
      "type",
    ]);
  });

  it("accepts a safe detail override", async () => {
    const response = await appFor(404, "note_not_found", "That note is gone.").request(
      "/",
    );
    const body = ProblemSchema.parse(await response.json());

    expect(body.detail).toBe("That note is gone.");
  });

  it("generates a fresh request id for every response", async () => {
    const app = appFor(400, "bad_request");

    const first = ProblemSchema.parse(await (await app.request("/")).json());
    const second = ProblemSchema.parse(await (await app.request("/")).json());

    expect(first.requestId).not.toBe(second.requestId);
  });

  it("refuses a status that disagrees with the code", () => {
    const context = {
      body: (body: string, status: number, headers: Record<string, string>) =>
        new Response(body, { status, headers }),
    } as unknown as Context;

    expect(() => problem(context, 400, "internal_error")).toThrow(TypeError);
  });
});

function appFor(status: ContentfulStatusCode, code: ProblemCode, detail?: string): Hono {
  const app = new Hono();
  app.get("/", (c) => problem(c, status, code, detail));
  return app;
}
