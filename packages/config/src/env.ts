import type { z } from "zod";

/** The shape both apps pass in. A key that is absent reads as undefined. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

export class EnvValidationError extends Error {
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    super(`Invalid environment: ${variables.join(", ")}`);
    this.name = "EnvValidationError";
    this.variables = variables;
  }
}

/**
 * Parses the source against a Zod schema and freezes the result.
 *
 * Issues are collapsed to variable names and sorted, so one failure reports every
 * bad variable at once instead of the first one. Values never appear in the error,
 * because a boot failure in CI is often pasted into an issue.
 */
export function createEnv<Schema extends z.ZodType>(
  schema: Schema,
  source: EnvSource,
): Readonly<z.output<Schema>> {
  const result = schema.safeParse(source);

  if (!result.success) {
    throw new EnvValidationError(collectVariables(result.error));
  }

  return Object.freeze(result.data);
}

function collectVariables(error: z.ZodError): string[] {
  const names = error.issues.map((issue) => {
    const [first] = issue.path;
    return typeof first === "string" ? first : "environment";
  });

  return [...new Set(names)].sort();
}

/** One line, no stack trace, no values. */
export function formatEnvError(error: unknown): string | undefined {
  if (!(error instanceof EnvValidationError)) return undefined;

  const list = error.variables.join(", ");

  return error.variables.length === 1
    ? `env: ${list} is missing or invalid`
    : `env: ${list} are missing or invalid`;
}

/**
 * Writes the readable line to stderr. Returns false when the error is something
 * else, so the caller can rethrow instead of hiding a real bug.
 */
export function reportEnvError(error: unknown): boolean {
  const line = formatEnvError(error);

  if (line === undefined) return false;

  process.stderr.write(`${line}\n`);

  return true;
}
