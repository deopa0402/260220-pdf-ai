import db from "@/lib/db";
import type { NewSharedSession, SharedSession } from "@/lib/db/types";

const shareDb = db.withSchema("share");

export async function createSharedSession(input: NewSharedSession): Promise<SharedSession> {
  const inserted = await shareDb
    .insertInto("shared_sessions")
    .values(input)
    .returningAll()
    .executeTakeFirstOrThrow();
  return inserted;
}

export async function findSharedSessionByPublicId(publicId: string): Promise<SharedSession | null> {
  const row = await shareDb
    .selectFrom("shared_sessions")
    .selectAll()
    .where("public_id", "=", publicId)
    .executeTakeFirst();
  return row ?? null;
}

export async function findSharedSessionByPublicIdAndPassword(
  publicId: string,
  password: string
): Promise<SharedSession | null> {
  const row = await shareDb
    .selectFrom("shared_sessions")
    .selectAll()
    .where("public_id", "=", publicId)
    .where("password", "=", password)
    .executeTakeFirst();
  return row ?? null;
}

export async function consumeChatQuota(publicId: string, password: string): Promise<SharedSession | null> {
  const row = await shareDb
    .updateTable("shared_sessions")
    .set(({ eb }) => ({
      chat_limit_used: eb("chat_limit_used", "+", 1),
    }))
    .where("public_id", "=", publicId)
    .where("password", "=", password)
    .whereRef("chat_limit_used", "<", "chat_limit_total")
    .returningAll()
    .executeTakeFirst();
  return row ?? null;
}
