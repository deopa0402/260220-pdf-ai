import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

export interface SharedSessionRow {
  id: Generated<string>;
  public_id: string;
  password: string;
  pdf_s3_key: string;
  payload: ColumnType<Record<string, unknown>, Record<string, unknown>, Record<string, unknown>>;
  chat_limit_total: number;
  chat_limit_used: Generated<number>;
  created_at: Generated<Date>;
}

export interface DB {
  shared_sessions: SharedSessionRow;
}

export type SharedSession = Selectable<SharedSessionRow>;
export type NewSharedSession = Insertable<SharedSessionRow>;
export type SharedSessionPatch = Updateable<SharedSessionRow>;
