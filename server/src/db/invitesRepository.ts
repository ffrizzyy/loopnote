import Database from "better-sqlite3";
import { randomInt } from "node:crypto";
import { InviteCode } from "./types";

interface InviteCodeRow {
  code: string;
  created_at: string;
  redeemed_by_user_id: string | null;
  redeemed_at: string | null;
}

function rowToInviteCode(row: InviteCodeRow): InviteCode {
  return {
    code: row.code,
    createdAt: row.created_at,
    redeemedByUserId: row.redeemed_by_user_id,
    redeemedAt: row.redeemed_at,
  };
}

// Excludes visually-ambiguous characters (0/O, 1/I) since these are
// typed by hand off an invite email/message.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

// An invite code is a credential, so it comes from the CSPRNG rather than
// Math.random, whose output is predictable.
function randomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

export class InvitesRepository {
  constructor(private readonly db: Database.Database) {}

  /** Generates `count` unique, unredeemed invite codes. Collisions against
   * existing codes are astronomically unlikely at this alphabet/length,
   * but retried anyway rather than assumed away, since `code` is a
   * primary key and a collision would otherwise throw. */
  generate(count: number): InviteCode[] {
    const insert = this.db.prepare(`INSERT INTO invite_codes (code, created_at) VALUES (?, ?)`);
    const now = new Date().toISOString();
    const codes: InviteCode[] = [];

    for (let i = 0; i < count; i++) {
      let inserted = false;
      while (!inserted) {
        const code = randomCode();
        try {
          insert.run(code, now);
          codes.push({ code, createdAt: now, redeemedByUserId: null, redeemedAt: null });
          inserted = true;
        } catch (err) {
          // Primary key collision — try another code. Anything else (a
          // closed or read-only database, say) would fail identically on
          // every retry, so it's rethrown rather than looped on forever.
          if ((err as { code?: string }).code !== "SQLITE_CONSTRAINT_PRIMARYKEY") throw err;
        }
      }
    }
    return codes;
  }

  find(code: string): InviteCode | undefined {
    const row = this.db.prepare(`SELECT * FROM invite_codes WHERE code = ?`).get(code) as
      | InviteCodeRow
      | undefined;
    return row ? rowToInviteCode(row) : undefined;
  }

  /** Marks a code redeemed by a user. Throws if the code doesn't exist or
   * was already redeemed — callers should check `find()` first for a
   * friendlier error message than this throw. */
  redeem(code: string, userId: string): InviteCode {
    const existing = this.find(code);
    if (!existing) {
      throw new Error(`No invite code ${code}`);
    }
    if (existing.redeemedByUserId) {
      throw new Error(`Invite code ${code} was already redeemed`);
    }

    const now = new Date().toISOString();
    this.db
      .prepare(`UPDATE invite_codes SET redeemed_by_user_id = ?, redeemed_at = ? WHERE code = ?`)
      .run(userId, now, code);
    return { ...existing, redeemedByUserId: userId, redeemedAt: now };
  }
}
