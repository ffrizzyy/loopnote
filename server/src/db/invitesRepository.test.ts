import Database from "better-sqlite3";
import { createDb } from "./client";
import { InvitesRepository } from "./invitesRepository";
import { UsersRepository } from "./usersRepository";

describe("InvitesRepository", () => {
  let db: Database.Database;
  let invites: InvitesRepository;
  let users: UsersRepository;

  beforeEach(() => {
    db = createDb(":memory:");
    invites = new InvitesRepository(db);
    users = new UsersRepository(db);
  });
  afterEach(() => db.close());

  it("generates the requested number of unique, unredeemed codes", () => {
    const codes = invites.generate(5);
    expect(codes).toHaveLength(5);
    expect(new Set(codes.map((c) => c.code)).size).toBe(5);
    for (const c of codes) expect(c.redeemedByUserId).toBeNull();
  });

  it("redeems a code for a user", () => {
    const [code] = invites.generate(1);
    const user = users.create("student@example.com");

    const redeemed = invites.redeem(code.code, user.id);
    expect(redeemed.redeemedByUserId).toBe(user.id);
    expect(redeemed.redeemedAt).not.toBeNull();

    const reloaded = invites.find(code.code)!;
    expect(reloaded.redeemedByUserId).toBe(user.id);
  });

  it("throws when redeeming a code that's already been redeemed", () => {
    const [code] = invites.generate(1);
    const userA = users.create("a@example.com");
    const userB = users.create("b@example.com");

    invites.redeem(code.code, userA.id);
    expect(() => invites.redeem(code.code, userB.id)).toThrow();
  });

  it("throws when redeeming a code that doesn't exist", () => {
    const user = users.create("a@example.com");
    expect(() => invites.redeem("NOTREAL1", user.id)).toThrow();
  });
});
