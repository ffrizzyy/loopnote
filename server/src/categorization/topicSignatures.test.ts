import Database from "better-sqlite3";
import { createDb } from "../db/client";
import { NotesRepository } from "../db/notesRepository";
import { TopicsRepository } from "../db/topicsRepository";
import { buildTopicSignatures } from "./topicSignatures";

describe("buildTopicSignatures", () => {
  let db: Database.Database;
  let notes: NotesRepository;
  let topics: TopicsRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    notes = new NotesRepository(db);
    topics = new TopicsRepository(db);
  });

  afterEach(() => db.close());

  it("aggregates deduplicated tags across every note in a topic", () => {
    const bio = topics.create("Biology");
    notes.createWithFlashcards({
      topicId: bio.id,
      sourceImagePath: "/a.jpg",
      extractedText: "a",
      summary: "a",
      tags: ["cells", "biology"],
      flashcards: [],
    });
    notes.createWithFlashcards({
      topicId: bio.id,
      sourceImagePath: "/b.jpg",
      extractedText: "b",
      summary: "b",
      tags: ["biology", "genetics"],
      flashcards: [],
    });

    const signatures = buildTopicSignatures(topics, notes);
    const bioSig = signatures.find((s) => s.topicId === bio.id);
    expect(bioSig?.tags.sort()).toEqual(["biology", "cells", "genetics"]);
  });

  it("includes topics with no notes yet as an empty-tags signature", () => {
    topics.create("Empty Topic");
    const signatures = buildTopicSignatures(topics, notes);
    expect(signatures).toHaveLength(1);
    expect(signatures[0].tags).toEqual([]);
  });

  it("returns an empty list when there are no topics", () => {
    expect(buildTopicSignatures(topics, notes)).toEqual([]);
  });
});
