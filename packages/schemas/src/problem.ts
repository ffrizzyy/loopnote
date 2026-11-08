import { z } from "zod";

/**
 * The published problem codes. This registry is append-only: a code that has
 * shipped keeps its spelling, status, title, and default detail forever, because
 * clients branch on the code and the test below treats this literal as a contract.
 *
 * Add a new entry when a new failure mode appears. Never edit an existing one.
 */
export const problemRegistry = {
  bad_request: {
    status: 400,
    title: "Bad request",
    detail: "The request is malformed.",
  },
  unauthorized: {
    status: 401,
    title: "Unauthorized",
    detail: "Sign in to continue.",
  },
  forbidden: {
    status: 403,
    title: "Forbidden",
    detail: "You do not have access to this resource.",
  },
  not_found: {
    status: 404,
    title: "Not found",
    detail: "The resource does not exist or you do not have access.",
  },
  note_not_found: {
    status: 404,
    title: "Not found",
    detail: "The note does not exist or you do not have access.",
  },
  rate_limited: {
    status: 429,
    title: "Too many requests",
    detail: "Too many requests. Try again later.",
  },
  internal_error: {
    status: 500,
    title: "Internal server error",
    detail: "Something went wrong on our side.",
  },
} as const satisfies Record<
  string,
  { readonly status: number; readonly title: string; readonly detail: string }
>;

export type ProblemCode = keyof typeof problemRegistry;

export const problemCodes = Object.keys(problemRegistry) as [
  ProblemCode,
  ...ProblemCode[],
];

/** Stable URI base. The type is an identifier, not a page that clients fetch. */
export const PROBLEM_TYPE_BASE = "https://loopnote.app/problems";

export const PROBLEM_DETAIL_MAX_LENGTH = 300;

// A UUID in the detail is an internal identifier leaking into a client response.
// The check is intentionally narrow: prose never contains this shape by accident.
const INTERNAL_ID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/**
 * RFC 9457 problem details, matching SPEC-foundation.md section 3.1 exactly.
 *
 * Unknown keys are rejected, so a stray `stack` or database row cannot ride
 * along. `status`, `title`, and `detail` are also checked against the registry,
 * which means the schema alone refuses a response whose parts disagree.
 */
export const ProblemSchema = z
  .object({
    type: z.url(),
    title: z.string().min(1),
    status: z.number().int().min(400).max(599),
    code: z.enum(problemCodes),
    detail: z
      .string()
      .min(1)
      .max(PROBLEM_DETAIL_MAX_LENGTH)
      .refine((value) => !INTERNAL_ID.test(value), {
        message: "detail must not contain an internal identifier",
      }),
    requestId: z.uuidv7(),
  })
  .strict()
  .superRefine((problem, context) => {
    const definition = problemRegistry[problem.code];

    if (problem.type !== `${PROBLEM_TYPE_BASE}/${problem.code}`) {
      context.addIssue({
        code: "custom",
        path: ["type"],
        message: `type must be ${PROBLEM_TYPE_BASE}/${problem.code}`,
      });
    }

    if (problem.status !== definition.status) {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: `status must be ${definition.status} for ${problem.code}`,
      });
    }

    if (problem.title !== definition.title) {
      context.addIssue({
        code: "custom",
        path: ["title"],
        message: `title must be "${definition.title}" for ${problem.code}`,
      });
    }
  });

export type Problem = z.infer<typeof ProblemSchema>;
