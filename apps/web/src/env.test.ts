import { describe, expect, it, vi } from "vitest";

import { loadEnv } from "./env";

describe("web env", () => {
  it("defaults the app URL", () => {
    const env = loadEnv({ NODE_ENV: "development" });

    expect(env.APP_URL).toBe("http://localhost:3000");
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("accepts a configured app URL", () => {
    const env = loadEnv({ NODE_ENV: "production", APP_URL: "https://loopnote.app" });

    expect(env.APP_URL).toBe("https://loopnote.app");
  });

  it("rejects a URL without a protocol", () => {
    expect(() => loadEnv({ APP_URL: "loopnote.app" })).toThrow(/APP_URL/);
  });

  it("reads the process environment once and caches it", () => {
    vi.stubEnv("APP_URL", "http://localhost:3000");
    vi.stubEnv("NODE_ENV", "test");

    try {
      const first = loadEnv();
      const second = loadEnv();

      expect(first.APP_URL).toBe("http://localhost:3000");
      expect(second).toBe(first);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
