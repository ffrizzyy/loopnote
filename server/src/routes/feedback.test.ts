import request from "supertest";
import { createApp } from "../app";

describe("POST /feedback", () => {
  it("creates a feedback entry for a flashcard", async () => {
    const { app } = createApp();
    const res = await request(app)
      .post("/feedback")
      .send({ targetType: "flashcard", targetId: "card-1", kind: "flashcard", reason: "answer is wrong" });
    expect(res.status).toBe(201);
    expect(res.body.feedback.resolved).toBe(false);
  });

  it("400s for an invalid targetType", async () => {
    const { app } = createApp();
    const res = await request(app).post("/feedback").send({ targetType: "bogus", targetId: "x", kind: "summary" });
    expect(res.status).toBe(400);
  });

  it("400s for an invalid kind", async () => {
    const { app } = createApp();
    const res = await request(app).post("/feedback").send({ targetType: "note", targetId: "x", kind: "bogus" });
    expect(res.status).toBe(400);
  });
});

describe("GET /feedback and PATCH /feedback/:id/resolve", () => {
  it("lists feedback and lets the team resolve it", async () => {
    const { app } = createApp();
    const createRes = await request(app)
      .post("/feedback")
      .send({ targetType: "note", targetId: "note-1", kind: "summary", reason: "summary missed the point" });
    const id = createRes.body.feedback.id;

    const listRes = await request(app).get("/feedback");
    expect(listRes.body.feedback.map((f: { id: string }) => f.id)).toContain(id);

    const resolveRes = await request(app).patch(`/feedback/${id}/resolve`);
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.feedback.resolved).toBe(true);

    const unresolvedList = await request(app).get("/feedback?resolved=false");
    expect(unresolvedList.body.feedback.map((f: { id: string }) => f.id)).not.toContain(id);
  });

  it("404s when resolving a non-existent id", async () => {
    const { app } = createApp();
    const res = await request(app).patch("/feedback/does-not-exist/resolve");
    expect(res.status).toBe(404);
  });
});
