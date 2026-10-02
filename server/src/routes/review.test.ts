import request from "supertest";
import { createApp } from "../app";

async function importAndProcess(
  app: ReturnType<typeof createApp>["app"],
  queue: ReturnType<typeof createApp>["queue"],
  bytes: string,
  filename: string
): Promise<string> {
  const postRes = await request(app).post("/imports").attach("images", Buffer.from(bytes), filename);
  await queue.waitForIdle();
  return postRes.body.jobs[0].id;
}

describe("GET /review/pending", () => {
  it("is empty with no imports", async () => {
    const { app } = createApp();
    const res = await request(app).get("/review/pending");
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("includes a confidently-detected note with its summary and flashcards", async () => {
    const { app, queue } = createApp();
    const jobId = await importAndProcess(app, queue, "whiteboard bytes", "whiteboard-01.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].jobId).toBe(jobId);
    expect(res.body.items[0].flaggedForReview).toBe(false);
    expect(res.body.items[0].flashcards.length).toBeGreaterThan(0);
  });

  it("excludes a confidently-detected non-note", async () => {
    const { app, queue } = createApp();
    await importAndProcess(app, queue, "sunset photo", "beach-not-a-note.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items).toEqual([]);
  });

  it("includes a low-confidence result flagged for review", async () => {
    const { app, queue } = createApp();
    const jobId = await importAndProcess(app, queue, "blurry photo", "blurry-low-confidence.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].jobId).toBe(jobId);
    expect(res.body.items[0].flaggedForReview).toBe(true);
  });
});

describe("GET /review/pending — auto-categorization suggestion", () => {
  it("suggests an existing topic when tags overlap with it", async () => {
    const { app, queue, topicsRepo, notesRepo } = createApp();
    const bio = topicsRepo.create("Biology");
    // Seed the topic's signature: a note already in it with overlapping tags.
    notesRepo.createWithFlashcards({
      topicId: bio.id,
      sourceImagePath: "/seed.jpg",
      extractedText: "seed",
      summary: "seed",
      tags: ["study", "notes"],
      flashcards: [],
    });

    // Default mockSummarize output includes tags ["study", "notes"] for
    // genuinely-testable content (see summarization.ts) — same tags as
    // the seeded topic above, so this should match with confidence 1.
    await importAndProcess(app, queue, "note bytes", "note.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items[0].suggestedExistingTopic).toEqual({
      topicId: bio.id,
      topicName: "Biology",
      confidence: 1,
    });
  });

  it("suggests nothing when no existing topic overlaps", async () => {
    const { app, queue, topicsRepo, notesRepo } = createApp();
    const chem = topicsRepo.create("Chemistry");
    notesRepo.createWithFlashcards({
      topicId: chem.id,
      sourceImagePath: "/seed.jpg",
      extractedText: "seed",
      summary: "seed",
      tags: ["completely", "unrelated", "words"],
      flashcards: [],
    });

    await importAndProcess(app, queue, "note bytes", "note.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items[0].suggestedExistingTopic).toBeNull();
  });

  it("suggests nothing when there are no existing topics at all", async () => {
    const { app, queue } = createApp();
    await importAndProcess(app, queue, "note bytes", "note.jpg");

    const res = await request(app).get("/review/pending");
    expect(res.body.items[0].suggestedExistingTopic).toBeNull();
  });
});

describe("POST /review/:id/keep", () => {
  it("persists a note (unassigned) and removes the item from the pending list", async () => {
    const { app, queue, notesRepo } = createApp();
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");

    const keepRes = await request(app).post(`/review/${jobId}/keep`).send({});
    expect(keepRes.status).toBe(200);
    expect(keepRes.body.note.reviewStatus).toBe("kept");
    expect(keepRes.body.note.topicId).toBeNull();
    expect(notesRepo.get(keepRes.body.note.id)).toBeDefined();

    const pending = await request(app).get("/review/pending");
    expect(pending.body.items).toEqual([]);
  });

  it("creates a new topic and assigns the note to it when newTopicName is given", async () => {
    const { app, queue, topicsRepo } = createApp();
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");

    const keepRes = await request(app).post(`/review/${jobId}/keep`).send({ newTopicName: "Biology" });
    expect(keepRes.status).toBe(200);
    const topic = topicsRepo.get(keepRes.body.note.topicId);
    expect(topic?.name).toBe("Biology");
  });

  it("reuses an existing topic with the same name instead of creating a duplicate", async () => {
    const { app, queue, topicsRepo } = createApp();
    const firstJob = await importAndProcess(app, queue, "first note bytes", "first.jpg");
    const secondJob = await importAndProcess(app, queue, "second note bytes", "second.jpg");

    const first = await request(app).post(`/review/${firstJob}/keep`).send({ newTopicName: "Biology" });
    const second = await request(app).post(`/review/${secondJob}/keep`).send({ newTopicName: " biology " });

    expect(second.body.note.topicId).toBe(first.body.note.topicId);
    expect(topicsRepo.list()).toHaveLength(1);
  });

  it("404s for a job that's already been reviewed", async () => {
    const { app, queue } = createApp();
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");
    await request(app).post(`/review/${jobId}/keep`).send({});

    const secondAttempt = await request(app).post(`/review/${jobId}/keep`).send({});
    expect(secondAttempt.status).toBe(404);
  });
});

describe("POST /review/:id/merge", () => {
  it("assigns the note to an existing topic", async () => {
    const { app, queue, topicsRepo } = createApp();
    const bio = topicsRepo.create("Biology");
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");

    const mergeRes = await request(app).post(`/review/${jobId}/merge`).send({ topicId: bio.id });
    expect(mergeRes.status).toBe(200);
    expect(mergeRes.body.note.topicId).toBe(bio.id);
    expect(mergeRes.body.note.reviewStatus).toBe("merged");
  });

  it("400s when topicId is missing or doesn't exist", async () => {
    const { app, queue } = createApp();
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");

    const missing = await request(app).post(`/review/${jobId}/merge`).send({});
    expect(missing.status).toBe(400);

    const bogus = await request(app).post(`/review/${jobId}/merge`).send({ topicId: "does-not-exist" });
    expect(bogus.status).toBe(400);
  });
});

describe("POST /review/:id/discard", () => {
  it("actually removes the job (not just hides it) and creates no note", async () => {
    const { app, queue, notesRepo } = createApp();
    const jobId = await importAndProcess(app, queue, "note bytes", "note.jpg");

    const discardRes = await request(app).post(`/review/${jobId}/discard`);
    expect(discardRes.status).toBe(200);
    expect(discardRes.body.discarded).toBe(true);

    const jobLookup = await request(app).get(`/imports/${jobId}`);
    expect(jobLookup.status).toBe(404);

    const pending = await request(app).get("/review/pending");
    expect(pending.body.items).toEqual([]);

    expect(notesRepo.listPending()).toEqual([]);
  });

  it("404s for a non-review-candidate job id", async () => {
    const { app } = createApp();
    const res = await request(app).post("/review/does-not-exist/discard");
    expect(res.status).toBe(404);
  });
});
