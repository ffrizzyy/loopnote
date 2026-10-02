import Database from "better-sqlite3";
import { createDb } from "./client";
import { FeedbackRepository } from "./feedbackRepository";

describe("FeedbackRepository", () => {
  let db: Database.Database;
  let feedback: FeedbackRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    feedback = new FeedbackRepository(db);
  });
  afterEach(() => db.close());

  it("creates an unresolved feedback entry", () => {
    const entry = feedback.create({ targetType: "flashcard", targetId: "card-1", kind: "flashcard", reason: "wrong answer" });
    expect(entry.resolved).toBe(false);
    expect(entry.reason).toBe("wrong answer");
  });

  it("allows a null reason", () => {
    const entry = feedback.create({ targetType: "job", targetId: "job-1", kind: "detection" });
    expect(entry.reason).toBeNull();
  });

  it("lists unresolved items before resolved ones by default", () => {
    const a = feedback.create({ targetType: "note", targetId: "note-1", kind: "summary" });
    const b = feedback.create({ targetType: "note", targetId: "note-2", kind: "summary" });
    feedback.resolve(a.id);

    const list = feedback.list();
    expect(list[0].id).toBe(b.id); // unresolved first
    expect(list[1].id).toBe(a.id);
  });

  it("filters by resolved status", () => {
    const a = feedback.create({ targetType: "note", targetId: "note-1", kind: "summary" });
    const b = feedback.create({ targetType: "note", targetId: "note-2", kind: "summary" });
    feedback.resolve(a.id);

    expect(feedback.list({ resolved: true }).map((f) => f.id)).toEqual([a.id]);
    expect(feedback.list({ resolved: false }).map((f) => f.id)).toEqual([b.id]);
  });

  it("throws when resolving a non-existent entry", () => {
    expect(() => feedback.resolve("does-not-exist")).toThrow();
  });
});
