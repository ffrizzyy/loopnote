import request from "supertest";
import { createApp } from "../app";

describe("PATCH /notes/:id/topic", () => {
  it("reassigns a note to a different existing topic", async () => {
    const { app, notesRepo, topicsRepo } = createApp();
    const bio = topicsRepo.create("Biology");
    const chem = topicsRepo.create("Chemistry");
    const note = notesRepo.createWithFlashcards({
      topicId: bio.id,
      sourceImagePath: "/x.jpg",
      extractedText: "x",
      summary: "x",
      tags: [],
      flashcards: [],
    });

    const res = await request(app).patch(`/notes/${note.id}/topic`).send({ topicId: chem.id });
    expect(res.status).toBe(200);
    expect(res.body.note.topicId).toBe(chem.id);
  });

  it("unassigns a note from its topic when topicId is null", async () => {
    const { app, notesRepo, topicsRepo } = createApp();
    const bio = topicsRepo.create("Biology");
    const note = notesRepo.createWithFlashcards({
      topicId: bio.id,
      sourceImagePath: "/x.jpg",
      extractedText: "x",
      summary: "x",
      tags: [],
      flashcards: [],
    });

    const res = await request(app).patch(`/notes/${note.id}/topic`).send({ topicId: null });
    expect(res.status).toBe(200);
    expect(res.body.note.topicId).toBeNull();
  });

  it("400s for a topicId that doesn't exist", async () => {
    const { app, notesRepo } = createApp();
    const note = notesRepo.createWithFlashcards({
      sourceImagePath: "/x.jpg",
      extractedText: "x",
      summary: "x",
      tags: [],
      flashcards: [],
    });

    const res = await request(app).patch(`/notes/${note.id}/topic`).send({ topicId: "does-not-exist" });
    expect(res.status).toBe(400);
  });

  it("404s for a note that doesn't exist", async () => {
    const { app, topicsRepo } = createApp();
    const bio = topicsRepo.create("Biology");
    const res = await request(app).patch(`/notes/does-not-exist/topic`).send({ topicId: bio.id });
    expect(res.status).toBe(404);
  });
});
