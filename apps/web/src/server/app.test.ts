import { ProblemSchema } from "@loopnote/schemas";
import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

import { createApp } from "./app";

describe("api app", () => {
  it("serves health with the package version and no-store", async () => {
    const response = await createApp().request("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      version: packageJson.version,
    });
  });

  it("turns an unknown route into a problem", async () => {
    const response = await createApp().request("/api/v1/nope");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(ProblemSchema.parse(await response.json()).code).toBe("not_found");
  });

  it("keeps an unknown path outside v1 in the same shape", async () => {
    const response = await createApp().request("/api/v2/nope");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
  });

  it("does not leak a thrown error", async () => {
    const app = createApp();

    app.get("/boom", () => {
      throw new Error("database password is hunter2");
    });

    const response = await app.request("/api/v1/boom");
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("stack");
    expect(ProblemSchema.parse(JSON.parse(text)).code).toBe("internal_error");
  });
});
