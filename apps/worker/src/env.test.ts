import { describe, expect, it, vi } from "vitest";

import { loadEnv } from "./env.js";

describe("worker env", () => {
  it("starts in development without a database", () => {
    const env = loadEnv({ NODE_ENV: "development" });

    expect(env.NODE_ENV).toBe("development");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.WORKER_HEARTBEAT_MS).toBe(30_000);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("requires a database in production", () => {
    expect(() => loadEnv({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });

  it("accepts production with a database", () => {
    const env = loadEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgres://user:pass@db:5432/loopnote",
    });

    expect(env.DATABASE_URL).toBe("postgres://user:pass@db:5432/loopnote");
  });

  it("rejects a heartbeat outside the allowed range", () => {
    expect(() => loadEnv({ WORKER_HEARTBEAT_MS: "999" })).toThrow(/WORKER_HEARTBEAT_MS/);
    expect(() => loadEnv({ WORKER_HEARTBEAT_MS: "300001" })).toThrow(
      /WORKER_HEARTBEAT_MS/,
    );
  });

  it("reads the process environment when no source is given", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("WORKER_HEARTBEAT_MS", "2000");
    vi.stubEnv("DATABASE_URL", undefined);

    try {
      const env = loadEnv();

      expect(env.NODE_ENV).toBe("test");
      expect(env.WORKER_HEARTBEAT_MS).toBe(2_000);
      expect(env.DATABASE_URL).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
