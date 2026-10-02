import request from "supertest";
import { createApp } from "./app";
import { MAX_IMAGES_PER_REQUEST } from "./routes/imports";

describe("POST /imports", () => {
  it("returns 400 when no images are attached", async () => {
    const { app } = createApp();
    const res = await request(app).post("/imports");
    expect(res.status).toBe(400);
  });

  it("accepts multiple images and returns immediately with queued job IDs", async () => {
    const { app, queue } = createApp();
    const res = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("image-one-bytes"), "one.png")
      .attach("images", Buffer.from("image-two-bytes"), "two.png");

    expect(res.status).toBe(202);
    expect(res.body.jobs).toHaveLength(2);
    for (const job of res.body.jobs) {
      expect(job.status).toBe("queued");
      expect(job.duplicate).toBe(false);
      expect(typeof job.id).toBe("string");
    }

    // The response above didn't wait on processing — status is still
    // "queued" at response time even though the queue picks it up right
    // after. Draining here just lets the test assert the end state below.
    await queue.waitForIdle();
  });

  it("dedupes identical image bytes within one request", async () => {
    const { app } = createApp();
    const sameBytes = Buffer.from("identical-image-bytes");

    const res = await request(app)
      .post("/imports")
      .attach("images", sameBytes, "a.png")
      .attach("images", sameBytes, "a-copy.png");

    expect(res.status).toBe(202);
    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.jobs[0].duplicate).toBe(false);
    expect(res.body.jobs[1].duplicate).toBe(true);
    expect(res.body.jobs[1].id).toBe(res.body.jobs[0].id);
  });

  it("dedupes identical image bytes across separate requests", async () => {
    const { app } = createApp();
    const bytes = Buffer.from("some-photo-bytes");

    const first = await request(app).post("/imports").attach("images", bytes, "first.png");
    const second = await request(app).post("/imports").attach("images", bytes, "second.png");

    expect(first.body.jobs[0].duplicate).toBe(false);
    expect(second.body.jobs[0].duplicate).toBe(true);
    expect(second.body.jobs[0].id).toBe(first.body.jobs[0].id);
  });
});

describe("POST /imports — limits and retries", () => {
  it("400s with a JSON error when more images are attached than one request allows", async () => {
    const { app } = createApp();
    let req = request(app).post("/imports");
    for (let i = 0; i <= MAX_IMAGES_PER_REQUEST; i++) {
      req = req.attach("images", Buffer.from(`image-${i}`), `image-${i}.png`);
    }

    const res = await req;
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe("string");
  });

  it("re-queues a failed job when the same image is uploaded again, rather than returning it dead", async () => {
    const { app, queue, repo } = createApp();
    const bytes = Buffer.from("bytes-of-a-job-that-failed");

    const first = await request(app).post("/imports").attach("images", bytes, "note.png");
    await queue.waitForIdle();
    const jobId = first.body.jobs[0].id;
    repo.updateStatus(jobId, "failed", "simulated processing failure");

    const retry = await request(app).post("/imports").attach("images", bytes, "note.png");
    expect(retry.body.jobs[0]).toEqual({ id: jobId, status: "queued", duplicate: true });

    await queue.waitForIdle();
    expect(repo.get(jobId)?.status).toBe("done");
    expect(repo.get(jobId)?.error).toBeNull();
  });

  it("stores an image whose filename has an unsafe extension without carrying that extension over", async () => {
    const { app, queue, repo } = createApp();
    const res = await request(app).post("/imports").attach("images", Buffer.from("odd-name-bytes"), "note.p*g");
    await queue.waitForIdle();

    const job = repo.get(res.body.jobs[0].id);
    expect(job?.status).toBe("done");
    expect(job?.storedPath.endsWith(job.imageHash)).toBe(true);
  });
});

describe("GET /imports/:id", () => {
  it("404s for an unknown job", async () => {
    const { app } = createApp();
    const res = await request(app).get("/imports/does-not-exist");
    expect(res.status).toBe(404);
  });

  it("reflects the job moving from queued to done as the worker processes it", async () => {
    const { app, queue } = createApp();
    const postRes = await request(app)
      .post("/imports")
      .attach("images", Buffer.from("some-bytes"), "note.png");

    const jobId = postRes.body.jobs[0].id;

    await queue.waitForIdle();

    const getRes = await request(app).get(`/imports/${jobId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe("done");
    expect(getRes.body.id).toBe(jobId);
  });
});
