import Database from "better-sqlite3";
import { createDb } from "./client";
import { WaitlistRepository } from "./waitlistRepository";

describe("WaitlistRepository", () => {
  let db: Database.Database;
  let waitlist: WaitlistRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    waitlist = new WaitlistRepository(db);
  });
  afterEach(() => db.close());

  it("joins the waitlist as not-yet-invited", () => {
    const entry = waitlist.join("student@example.com");
    expect(entry.invited).toBe(false);
  });

  it("is idempotent — joining again with the same email returns the existing entry", () => {
    const first = waitlist.join("a@example.com");
    const second = waitlist.join("a@example.com");
    expect(second.id).toBe(first.id);
    expect(waitlist.list()).toHaveLength(1);
  });

  it("lists entries oldest first", () => {
    waitlist.join("a@example.com");
    waitlist.join("b@example.com");
    const emails = waitlist.list().map((e) => e.email);
    expect(emails).toEqual(["a@example.com", "b@example.com"]);
  });

  it("marks an entry as invited", () => {
    waitlist.join("a@example.com");
    const updated = waitlist.markInvited("a@example.com");
    expect(updated.invited).toBe(true);
  });

  it("throws when marking a non-existent email as invited", () => {
    expect(() => waitlist.markInvited("nope@example.com")).toThrow();
  });
});
