import request from "supertest";
import { createApp } from "../app";

describe("study endpoints (end to end)", () => {
  it("shows a kept note's flashcards as due, then removes them after a review", async () => {
    const { app, queue } = createApp();

    const postRes = await request(app).post("/imports").attach("images", Buffer.from("note bytes"), "note.jpg");
    const jobId = postRes.body.jobs[0].id;
    await queue.waitForIdle();

    const keepRes = await request(app).post(`/review/${jobId}/keep`).send({});
    const cardId = keepRes.body.note.flashcards[0].id;

    const dueRes = await request(app).get("/study/due");
    expect(dueRes.status).toBe(200);
    expect(dueRes.body.flashcards.map((c: { id: string }) => c.id)).toContain(cardId);

    const reviewRes = await request(app).post(`/study/${cardId}/review`).send({ quality: 4 });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.flashcard.repetitions).toBe(1);
    expect(reviewRes.body.flashcard.intervalDays).toBe(1);

    const dueAfter = await request(app).get("/study/due");
    expect(dueAfter.body.flashcards.map((c: { id: string }) => c.id)).not.toContain(cardId);
  });

  it("400s on an invalid quality value", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app).post("/imports").attach("images", Buffer.from("note bytes"), "note.jpg");
    await queue.waitForIdle();
    const keepRes = await request(app).post(`/review/${postRes.body.jobs[0].id}/keep`).send({});
    const cardId = keepRes.body.note.flashcards[0].id;

    const tooHigh = await request(app).post(`/study/${cardId}/review`).send({ quality: 6 });
    expect(tooHigh.status).toBe(400);

    const notInteger = await request(app).post(`/study/${cardId}/review`).send({ quality: 2.5 });
    expect(notInteger.status).toBe(400);
  });

  it("404s when reviewing a flashcard id that doesn't exist", async () => {
    const { app } = createApp();
    const res = await request(app).post("/study/does-not-exist/review").send({ quality: 4 });
    expect(res.status).toBe(404);
  });
});
