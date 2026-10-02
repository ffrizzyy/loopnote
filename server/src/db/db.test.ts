import Database from "better-sqlite3";
import { createDb } from "./client";
import { NotesRepository } from "./notesRepository";
import { TopicsRepository } from "./topicsRepository";

describe("persistence layer", () => {
  let db: Database.Database;
  let topics: TopicsRepository;
  let notes: NotesRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    topics = new TopicsRepository(db);
    notes = new NotesRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("TopicsRepository", () => {
    it("creates, fetches, renames, and lists topics", () => {
      const bio = topics.create("Biology");
      topics.create("Chemistry");

      expect(topics.get(bio.id)?.name).toBe("Biology");

      topics.rename(bio.id, "Biology 101");
      expect(topics.get(bio.id)?.name).toBe("Biology 101");

      const all = topics.list().map((t) => t.name);
      expect(all).toEqual(["Biology 101", "Chemistry"]);
    });
  });

  describe("NotesRepository", () => {
    it("creates a note with its flashcards atomically, defaulting to pending review", () => {
      const note = notes.createWithFlashcards({
        sourceImagePath: "/data/images/abc.jpg",
        extractedText: "mitochondria is the powerhouse of the cell",
        summary: "Cell biology basics",
        tags: ["biology", "cells"],
        flashcards: [{ question: "What is the powerhouse of the cell?", answer: "The mitochondria" }],
      });

      expect(note.reviewStatus).toBe("pending");
      expect(note.topicId).toBeNull();
      expect(note.tags).toEqual(["biology", "cells"]);
      expect(note.flashcards).toHaveLength(1);
      expect(note.flashcards[0].question).toContain("powerhouse");
    });

    it("produces a note with zero flashcards when given none, without erroring", () => {
      const note = notes.createWithFlashcards({
        sourceImagePath: "/data/images/list.jpg",
        extractedText: "milk, eggs, bread",
        summary: "Grocery list",
        tags: ["reference"],
        flashcards: [],
      });
      expect(note.flashcards).toEqual([]);
    });

    it("reassigns a note between topics", () => {
      const bio = topics.create("Biology");
      const chem = topics.create("Chemistry");
      const note = notes.createWithFlashcards({
        topicId: bio.id,
        sourceImagePath: "/x.jpg",
        extractedText: "text",
        summary: "summary",
        tags: [],
        flashcards: [],
      });
      expect(note.topicId).toBe(bio.id);

      const moved = notes.reassignTopic(note.id, chem.id);
      expect(moved.topicId).toBe(chem.id);

      const unassigned = notes.reassignTopic(note.id, null);
      expect(unassigned.topicId).toBeNull();
    });

    it("transitions review status without touching flashcards", () => {
      const note = notes.createWithFlashcards({
        sourceImagePath: "/x.jpg",
        extractedText: "text",
        summary: "summary",
        tags: [],
        flashcards: [{ question: "Q", answer: "A" }],
      });

      const kept = notes.setReviewStatus(note.id, "kept");
      expect(kept.reviewStatus).toBe("kept");
      expect(notes.get(note.id)?.flashcards).toHaveLength(1);
    });

    it("actually deletes a discarded note and its flashcards, not just hides them", () => {
      const note = notes.createWithFlashcards({
        sourceImagePath: "/x.jpg",
        extractedText: "text",
        summary: "summary",
        tags: [],
        flashcards: [{ question: "Q", answer: "A" }],
      });

      notes.remove(note.id);

      expect(notes.get(note.id)).toBeUndefined();
      const orphanCards = db.prepare("SELECT * FROM flashcards WHERE note_id = ?").all(note.id);
      expect(orphanCards).toHaveLength(0);
    });

    it("lists notes by topic and by pending review status", () => {
      const bio = topics.create("Biology");
      const inTopic = notes.createWithFlashcards({
        topicId: bio.id,
        sourceImagePath: "/a.jpg",
        extractedText: "a",
        summary: "a",
        tags: [],
        flashcards: [],
      });
      const unassigned = notes.createWithFlashcards({
        sourceImagePath: "/b.jpg",
        extractedText: "b",
        summary: "b",
        tags: [],
        flashcards: [],
      });
      notes.setReviewStatus(unassigned.id, "kept");

      const byTopic = notes.listByTopic(bio.id).map((n) => n.id);
      expect(byTopic).toEqual([inTopic.id]);

      const pending = notes.listPending().map((n) => n.id);
      expect(pending).toEqual([inTopic.id]);
    });
  });
});
