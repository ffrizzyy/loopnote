import request from "supertest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const { app } = createApp();
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("error responses", () => {
  it("404s with JSON for an unknown route", async () => {
    const { app } = createApp();
    const res = await request(app).get("/no-such-route");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });

  it("400s with JSON, not an HTML stack trace, for a malformed JSON body", async () => {
    const { app } = createApp();
    const res = await request(app).post("/waitlist").set("Content-Type", "application/json").send("{not json");
    expect(res.status).toBe(400);
    expect(res.type).toBe("application/json");
    expect(typeof res.body.error).toBe("string");
  });
});
