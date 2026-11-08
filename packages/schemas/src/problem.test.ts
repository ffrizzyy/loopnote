import { describe, expect, it } from "vitest";

import {
  ProblemSchema,
  problemCodes,
  problemRegistry,
  PROBLEM_DETAIL_MAX_LENGTH,
  PROBLEM_TYPE_BASE,
  type Problem,
  type ProblemCode,
} from "./problem.js";

/**
 * Intentionally duplicated. This literal is the published contract: adding a code
 * is allowed, but removing or renaming one, or changing its status or title, fails
 * here before it can break a client.
 */
const LOCKED_CODES = {
  bad_request: { status: 400, title: "Bad request" },
  unauthorized: { status: 401, title: "Unauthorized" },
  forbidden: { status: 403, title: "Forbidden" },
  not_found: { status: 404, title: "Not found" },
  note_not_found: { status: 404, title: "Not found" },
  rate_limited: { status: 429, title: "Too many requests" },
  internal_error: { status: 500, title: "Internal server error" },
} as const;

const validProblem: Problem = {
  type: `${PROBLEM_TYPE_BASE}/note_not_found`,
  title: "Not found",
  status: 404,
  code: "note_not_found",
  detail: "The note does not exist or you do not have access.",
  requestId: "0193f2c4-7a1e-7c3b-9d2f-2f6a1c8b4e10",
};

describe("ProblemSchema", () => {
  it("accepts the section 3.1 example", () => {
    expect(ProblemSchema.parse(validProblem)).toEqual(validProblem);
  });

  it("rejects unknown fields, including a stack", () => {
    const result = ProblemSchema.safeParse({
      ...validProblem,
      stack: "Error: boom\n    at handler",
    });

    expect(result.success).toBe(false);
    expect(issueCodes(result)).toContain("unrecognized_keys");
  });

  it("rejects a detail that contains an internal identifier", () => {
    const result = ProblemSchema.safeParse({
      ...validProblem,
      detail: `Note ${validProblem.requestId} is gone.`,
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("detail");
  });

  it("rejects an overlong detail", () => {
    const result = ProblemSchema.safeParse({
      ...validProblem,
      detail: "a".repeat(PROBLEM_DETAIL_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("detail");
  });

  it("rejects an unknown code", () => {
    const result = ProblemSchema.safeParse({ ...validProblem, code: "made_up" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("code");
  });

  it("rejects a request id that is not UUIDv7", () => {
    const result = ProblemSchema.safeParse({
      ...validProblem,
      requestId: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("requestId");
  });

  it("rejects a status that disagrees with the code", () => {
    const result = ProblemSchema.safeParse({ ...validProblem, status: 400 });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("status");
  });

  it("rejects a type that disagrees with the code", () => {
    const result = ProblemSchema.safeParse({
      ...validProblem,
      type: `${PROBLEM_TYPE_BASE}/bad_request`,
    });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("type");
  });

  it("rejects a title that disagrees with the code", () => {
    const result = ProblemSchema.safeParse({ ...validProblem, title: "Bad request" });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("title");
  });

  it("rejects a success status", () => {
    const result = ProblemSchema.safeParse({ ...validProblem, status: 200 });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("status");
  });
});

describe("problem registry", () => {
  it("keeps every published code, status, and title", () => {
    for (const [code, expected] of Object.entries(LOCKED_CODES)) {
      expect(problemRegistry).toHaveProperty(code);
      expect(problemRegistry[code as ProblemCode]).toMatchObject(expected);
    }
  });

  it("lists each code once", () => {
    expect(new Set(problemCodes).size).toBe(problemCodes.length);
  });

  it("uses a client or server error status for every code", () => {
    for (const definition of Object.values(problemRegistry)) {
      expect(definition.status).toBeGreaterThanOrEqual(400);
      expect(definition.status).toBeLessThanOrEqual(599);
      expect(definition.title.length).toBeGreaterThan(0);
      expect(definition.detail.length).toBeGreaterThan(0);
    }
  });
});

function issueCodes(result: ReturnType<typeof ProblemSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.code);
}

function issuePaths(result: ReturnType<typeof ProblemSchema.safeParse>): string[] {
  return result.success
    ? []
    : result.error.issues.map((issue) => String(issue.path[0] ?? ""));
}
