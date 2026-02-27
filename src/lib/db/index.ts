import {
  DeduplicateJoinsPlugin,
  Kysely,
  ParseJSONResultsPlugin,
  PostgresDialect,
} from "kysely";
import { Pool } from "pg";
import type { DB } from "./types";

const connectionString =
  process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn("[Kysely] DATABASE_URL not set - using dummy connection for build time");
}

const pool = new Pool({ connectionString });
const dialect = new PostgresDialect({ pool });

const db = new Kysely<DB>({
  dialect,
  plugins: [new ParseJSONResultsPlugin(), new DeduplicateJoinsPlugin()],
});

export default db;
