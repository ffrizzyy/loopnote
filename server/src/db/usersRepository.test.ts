import Database from "better-sqlite3";
import { createDb } from "./client";
import { UsersRepository } from "./usersRepository";

describe("UsersRepository", () => {
  let db: Database.Database;
  let users: UsersRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    users = new UsersRepository(db);
  });
  afterEach(() => db.close());

  it("creates and fetches a user by id and email", () => {
    const user = users.create("student@example.com");
    expect(users.get(user.id)?.email).toBe("student@example.com");
    expect(users.findByEmail("student@example.com")?.id).toBe(user.id);
  });

  it("getOrCreate is idempotent by email", () => {
    const first = users.getOrCreate("a@example.com");
    const second = users.getOrCreate("a@example.com");
    expect(second.id).toBe(first.id);
  });
});
