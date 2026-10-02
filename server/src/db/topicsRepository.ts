import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { Topic } from "./types";

interface TopicRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

function rowToTopic(row: TopicRow): Topic {
  return { id: row.id, name: row.name, createdAt: row.created_at, updatedAt: row.updated_at };
}

export class TopicsRepository {
  constructor(private readonly db: Database.Database) {}

  create(name: string): Topic {
    const now = new Date().toISOString();
    const id = randomUUID();
    this.db
      .prepare(`INSERT INTO topics (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`)
      .run(id, name, now, now);
    return { id, name, createdAt: now, updatedAt: now };
  }

  get(id: string): Topic | undefined {
    const row = this.db.prepare(`SELECT * FROM topics WHERE id = ?`).get(id) as TopicRow | undefined;
    return row ? rowToTopic(row) : undefined;
  }

  /** Case-insensitive lookup, so "biology" finds "Biology" rather than
   * the caller creating a second, identically-named topic. */
  findByName(name: string): Topic | undefined {
    const row = this.db
      .prepare(`SELECT * FROM topics WHERE name = ? COLLATE NOCASE ORDER BY created_at ASC LIMIT 1`)
      .get(name) as TopicRow | undefined;
    return row ? rowToTopic(row) : undefined;
  }

  rename(id: string, name: string): Topic {
    const now = new Date().toISOString();
    const result = this.db.prepare(`UPDATE topics SET name = ?, updated_at = ? WHERE id = ?`).run(name, now, id);
    if (result.changes === 0) {
      throw new Error(`No topic with id ${id}`);
    }
    return { id, name, createdAt: this.get(id)!.createdAt, updatedAt: now };
  }

  list(): Topic[] {
    const rows = this.db.prepare(`SELECT * FROM topics ORDER BY name ASC`).all() as TopicRow[];
    return rows.map(rowToTopic);
  }
}
