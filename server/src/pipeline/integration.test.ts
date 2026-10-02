import request from "supertest";
import { createApp } from "../app";
import { CONFIDENCE_THRESHOLD } from "./processImportJob";

describe("import pipeline: detection + summarization (end to end via the API)", () => {
  it("marks a confidently-detected note done, unflagged, with extracted text and a summarization result", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("some whiteboard photo bytes"), "whiteboard-01.jpg");
    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const getRes = await request(app).get(`/imports/${jobId}`);
    expect(getRes.body.status).toBe("done");
    expect(getRes.body.detection.is_note).toBe(true);
    expect(getRes.body.detection.confidence).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    expect(getRes.body.detection.flaggedForReview).toBe(false);
    expect(getRes.body.detection.extracted_text.length).toBeGreaterThan(0);

    expect(getRes.body.summarization).not.toBeNull();
    expect(getRes.body.summarization.topic.length).toBeGreaterThan(0);
    expect(getRes.body.summarization.flashcards.length).toBeGreaterThan(0);
  });

  it("filters out a confidently-detected non-note without flagging it for review", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("a photo of a sunset"), "beach-not-a-note.jpg");
    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const getRes = await request(app).get(`/imports/${jobId}`);
    expect(getRes.body.status).toBe("done");
    expect(getRes.body.detection.is_note).toBe(false);
    expect(getRes.body.detection.flaggedForReview).toBe(false);
    expect(getRes.body.summarization).toBeNull();
  });

  it("flags a low-confidence result for review instead of auto-accepting or auto-discarding it, and never summarizes it", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("a blurry photo"), "blurry-low-confidence.jpg");
    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const getRes = await request(app).get(`/imports/${jobId}`);
    expect(getRes.body.status).toBe("done");
    expect(getRes.body.detection.confidence).toBeLessThan(CONFIDENCE_THRESHOLD);
    expect(getRes.body.detection.flaggedForReview).toBe(true);
    expect(getRes.body.summarization).toBeNull();
  });

  it("produces an empty flashcards array for reference-only content instead of inventing questions", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("a grocery list photo"), "groceries-reference-only.jpg");
    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const getRes = await request(app).get(`/imports/${jobId}`);
    expect(getRes.body.summarization).not.toBeNull();
    expect(getRes.body.summarization.flashcards).toEqual([]);
  });

  it("logs token usage for both the detection and summarization calls against the job", async () => {
    const { app, queue, usageLog } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("some note photo"), "note.jpg");
    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const usage = usageLog.forJob(jobId);
    const stages = usage.map((u) => u.stage).sort();
    expect(stages).toEqual(["detection", "summarization"]);
    for (const entry of usage) {
      expect(entry.inputTokens).toBeGreaterThan(0);
      expect(entry.outputTokens).toBeGreaterThan(0);
    }
  });
});
