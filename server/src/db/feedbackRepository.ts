import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { FeedbackEntry, FeedbackKind, FeedbackTargetType } from "./types";

interface FeedbackRow {
  id: string;
  target_type: FeedbackTargetType;
  target_id: string;
  kind: FeedbackKind;
  reason: string | null;
  resolved: number;
  created_at: string;
  updated_at: string;
}

function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    kind: row.kind,
    reason: row.reason,
    resolved: Boolean(row.resolved),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateFeedbackInput {
  targetType: FeedbackTargetType;
  targetId: string;
  kind: FeedbackKind;
  reason?: string | null;
}

export class FeedbackRepository {
  constructor(private readonly db: Database.Database) {}

  create(input: CreateFeedbackInput): FeedbackEntry {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO feedback (id, target_type, target_id, kind, reason, resolved, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .run(id, input.targetType, input.targetId, input.kind, input.reason ?? null, now, now);
    return {
      id,
      targetType: input.targetType,
      targetId: input.targetId,
      kind: input.kind,
      reason: input.reason ?? null,
      resolved: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  get(id: string): FeedbackEntry | undefined {
    const row = this.db.prepare(`SELECT * FROM feedback WHERE id = ?`).get(id) as FeedbackRow | undefined;
    return row ? rowToFeedback(row) : undefined;
  }

  /** Team review queue — unresolved first (oldest first) so nothing gets
   * "logged and forgotten": resolved items sort after, so the default
   * view is always the actionable backlog. */
  list(filter: { resolved?: boolean } = {}): FeedbackEntry[] {
    if (filter.resolved === undefined) {
      const rows = this.db
        .prepare(`SELECT * FROM feedback ORDER BY resolved ASC, created_at ASC`)
        .all() as FeedbackRow[];
      return rows.map(rowToFeedback);
    }
    const rows = this.db
      .prepare(`SELECT * FROM feedback WHERE resolved = ? ORDER BY created_at ASC`)
      .all(filter.resolved ? 1 : 0) as FeedbackRow[];
    return rows.map(rowToFeedback);
  }

  resolve(id: string): FeedbackEntry {
    const now = new Date().toISOString();
    const result = this.db.prepare(`UPDATE feedback SET resolved = 1, updated_at = ? WHERE id = ?`).run(now, id);
    if (result.changes === 0) {
      throw new Error(`No feedback entry with id ${id}`);
    }
    return this.get(id)!;
  }
}
