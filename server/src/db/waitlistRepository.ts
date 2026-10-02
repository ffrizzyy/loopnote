import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { WaitlistEntry } from "./types";

interface WaitlistRow {
  id: string;
  email: string;
  created_at: string;
  invited: number;
}

function rowToEntry(row: WaitlistRow): WaitlistEntry {
  return { id: row.id, email: row.email, createdAt: row.created_at, invited: Boolean(row.invited) };
}

export class WaitlistRepository {
  constructor(private readonly db: Database.Database) {}

  /** Idempotent by email — joining again just returns the existing entry. */
  join(email: string): WaitlistEntry {
    const existing = this.db.prepare(`SELECT * FROM waitlist_entries WHERE email = ?`).get(email) as
      | WaitlistRow
      | undefined;
    if (existing) return rowToEntry(existing);

    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(`INSERT INTO waitlist_entries (id, email, created_at, invited) VALUES (?, ?, ?, 0)`)
      .run(id, email, now);
    return { id, email, createdAt: now, invited: false };
  }

  list(): WaitlistEntry[] {
    const rows = this.db.prepare(`SELECT * FROM waitlist_entries ORDER BY created_at ASC`).all() as WaitlistRow[];
    return rows.map(rowToEntry);
  }

  markInvited(email: string): WaitlistEntry {
    const result = this.db.prepare(`UPDATE waitlist_entries SET invited = 1 WHERE email = ?`).run(email);
    if (result.changes === 0) {
      throw new Error(`No waitlist entry for ${email}`);
    }
    return rowToEntry(
      this.db.prepare(`SELECT * FROM waitlist_entries WHERE email = ?`).get(email) as WaitlistRow
    );
  }
}
