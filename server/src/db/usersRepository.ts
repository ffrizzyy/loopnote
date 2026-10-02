import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { User } from "./types";

interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

function rowToUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

export class UsersRepository {
  constructor(private readonly db: Database.Database) {}

  findByEmail(email: string): User | undefined {
    const row = this.db.prepare(`SELECT * FROM users WHERE email = ?`).get(email) as UserRow | undefined;
    return row ? rowToUser(row) : undefined;
  }

  get(id: string): User | undefined {
    const row = this.db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as UserRow | undefined;
    return row ? rowToUser(row) : undefined;
  }

  create(email: string): User {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db.prepare(`INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)`).run(id, email, now);
    return { id, email, createdAt: now };
  }

  /** Redemption is idempotent by email — redeeming again with the same
   * email returns the existing user rather than erroring. */
  getOrCreate(email: string): User {
    return this.findByEmail(email) ?? this.create(email);
  }
}
