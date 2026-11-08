import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createEnv, EnvValidationError, formatEnvError, reportEnvError } from "./env.js";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1).optional(),
  WORKER_HEARTBEAT_MS: z.coerce.number().int().min(1_000).default(30_000),
});

describe("createEnv", () => {
  it("applies defaults and freezes the result", () => {
    const env = createEnv(schema, { NODE_ENV: "test" });

    expect(env.NODE_ENV).toBe("test");
    expect(env.WORKER_HEARTBEAT_MS).toBe(30_000);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("coerces numeric strings", () => {
    const env = createEnv(schema, { WORKER_HEARTBEAT_MS: "5000" });

    expect(env.WORKER_HEARTBEAT_MS).toBe(5_000);
  });

  it("names every invalid variable once, sorted, without printing values", () => {
    const error = captureError(() =>
      createEnv(schema, {
        NODE_ENV: "production",
        DATABASE_URL: "",
        WORKER_HEARTBEAT_MS: "0",
      }),
    );

    expect(error).toBeInstanceOf(EnvValidationError);
    expect((error as EnvValidationError).variables).toEqual([
      "DATABASE_URL",
      "WORKER_HEARTBEAT_MS",
    ]);
    expect(formatEnvError(error)).toBe(
      "env: DATABASE_URL, WORKER_HEARTBEAT_MS are missing or invalid",
    );
    expect(formatEnvError(error)).not.toContain("0");
  });

  it("uses the singular form for one variable", () => {
    const error = captureError(() => createEnv(schema, { WORKER_HEARTBEAT_MS: "1" }));

    expect(formatEnvError(error)).toBe("env: WORKER_HEARTBEAT_MS is missing or invalid");
  });

  it("passes through an unrelated error", () => {
    expect(formatEnvError(new Error("boom"))).toBeUndefined();
  });

  it("reports one line to stderr and declines other errors", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    try {
      expect(reportEnvError(new Error("boom"))).toBe(false);
      expect(write).not.toHaveBeenCalled();

      const error = captureError(() => createEnv(schema, { WORKER_HEARTBEAT_MS: "1" }));

      expect(reportEnvError(error)).toBe(true);
      expect(write).toHaveBeenCalledExactlyOnceWith(
        "env: WORKER_HEARTBEAT_MS is missing or invalid\n",
      );
    } finally {
      write.mockRestore();
    }
  });
});

function captureError(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error("expected the call to throw");
}
