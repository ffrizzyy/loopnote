import Database from "better-sqlite3";
import { createDb } from "./client";
import { NotesRepository } from "./notesRepository";
import { FlashcardsRepository } from "./flashcardsRepository";

describe("FlashcardsRepository", () => {
  let db: Database.Database;
  let notes: NotesRepository;
  let flashcards: FlashcardsRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    notes = new NotesRepository(db);
    flashcards = new FlashcardsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("marks newly-created flashcards as due immediately", () => {
    const note = notes.createWithFlashcards({
      sourceImagePath: "/x.jpg",
      extractedText: "text",
      summary: "summary",
      tags: [],
      flashcards: [{ question: "Q", answer: "A" }],
    });

    const due = flashcards.listDue();
    expect(due.map((c) => c.id)).toContain(note.flashcards[0].id);
    expect(due[0].repetitions).toBe(0);
    expect(due[0].easeFactor).toBe(2.5);
  });

  it("removes a card from the due list once reviewed with a future next_review_date", () => {
    const note = notes.createWithFlashcards({
      sourceImagePath: "/x.jpg",
      extractedText: "text",
      summary: "summary",
      tags: [],
      flashcards: [{ question: "Q", answer: "A" }],
    });
    const cardId = note.flashcards[0].id;

    flashcards.recordReview(cardId, 4); // quality 4 -> 1 day out, no longer due "now"

    const due = flashcards.listDue();
    expect(due.map((c) => c.id)).not.toContain(cardId);
  });

  it("shows a card as due again once its scheduled date has passed", () => {
    const note = notes.createWithFlashcards({
      sourceImagePath: "/x.jpg",
      extractedText: "text",
      summary: "summary",
      tags: [],
      flashcards: [{ question: "Q", answer: "A" }],
    });
    const cardId = note.flashcards[0].id;

    flashcards.recordReview(cardId, 4);

    const twoDaysLater = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const due = flashcards.listDue(twoDaysLater);
    expect(due.map((c) => c.id)).toContain(cardId);
  });

  it("orders due cards earliest-due first", () => {
    const noteA = notes.createWithFlashcards({
      sourceImagePath: "/a.jpg",
      extractedText: "a",
      summary: "a",
      tags: [],
      flashcards: [{ question: "QA", answer: "AA" }],
    });
    const noteB = notes.createWithFlashcards({
      sourceImagePath: "/b.jpg",
      extractedText: "b",
      summary: "b",
      tags: [],
      flashcards: [{ question: "QB", answer: "AB" }],
    });
    const cardA = noteA.flashcards[0].id;
    const cardB = noteB.flashcards[0].id;
    const now = new Date("2026-01-01T00:00:00.000Z");

    // Card A: one review at repetitions 0 -> interval 1 day -> due Jan 2.
    flashcards.recordReview(cardA, 4, now);
    // Card B: two reviews back-to-back at the same `now` -> repetitions
    // 0->1 (interval 1) then 1->2 (interval 6) -> due Jan 7, later than A.
    flashcards.recordReview(cardB, 4, now);
    flashcards.recordReview(cardB, 4, now);

    const dueLater = flashcards.listDue(new Date("2026-01-10T00:00:00.000Z"));
    const ids = dueLater.filter((c) => c.id === cardA || c.id === cardB).map((c) => c.id);
    expect(ids).toEqual([cardA, cardB]);
  });

  it("persists updated scheduling fields after a review", () => {
    const note = notes.createWithFlashcards({
      sourceImagePath: "/x.jpg",
      extractedText: "text",
      summary: "summary",
      tags: [],
      flashcards: [{ question: "Q", answer: "A" }],
    });
    const cardId = note.flashcards[0].id;

    const updated = flashcards.recordReview(cardId, 4);
    expect(updated.repetitions).toBe(1);
    expect(updated.intervalDays).toBe(1);
    expect(updated.easeFactor).toBe(2.5);

    const reloaded = flashcards.get(cardId)!;
    expect(reloaded.repetitions).toBe(1);
    expect(reloaded.intervalDays).toBe(1);
  });

  it("throws when reviewing a flashcard id that doesn't exist", () => {
    expect(() => flashcards.recordReview("does-not-exist", 4)).toThrow();
  });
});
