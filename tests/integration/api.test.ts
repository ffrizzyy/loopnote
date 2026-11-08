import { ProblemSchema } from "@loopnote/schemas";
import { describe, expect, it } from "vitest";

import packageJson from "../../apps/web/package.json";
import { GET } from "../../apps/web/src/app/api/[[...route]]/route";
import { createApp } from "../../apps/web/src/server/app";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("mounted API", () => {
  it("serves health with the package version and no-store", async () => {
    const response = await GET(new Request("http://localhost/api/v1/health"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      version: packageJson.version,
    });
  });

  it("returns problem+json for an unknown route under v1", async () => {
    const response = await GET(new Request("http://localhost/api/v1/nope"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");

    const body = ProblemSchema.parse(await response.json());

    expect(body.code).toBe("not_found");
    expect(body.requestId).toMatch(UUID_V7);
  });

  it("returns problem+json for a path outside v1", async () => {
    const response = await GET(new Request("http://localhost/api/v2/nope"));

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(ProblemSchema.parse(await response.json()).code).toBe("not_found");
  });
});

describe("error handler", () => {
  it("hides a thrown error behind a generic 500 problem", async () => {
    const app = createApp();

    app.get("/boom", () => {
      throw new Error("database password is hunter2");
    });

    const response = await app.request("/api/v1/boom");

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/problem+json");

    const text = await response.text();

    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("database password");
    expect(text).not.toContain("stack");

    const body = ProblemSchema.parse(JSON.parse(text));

    expect(body.code).toBe("internal_error");
    expect(body.detail).toBe("Something went wrong on our side.");
    expect(body.requestId).toMatch(UUID_V7);
  });
});
