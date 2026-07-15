import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Query = <T = Row>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;

declare global {
  // eslint-disable-next-line no-var
  var solarStudioSqlite: Database.Database | undefined;
}

const configuredPath = process.env.SOLAR_STUDIO_DATA_PATH ?? "./data/solar-studio.db";
const dataPath = resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
mkdirSync(dirname(dataPath), { recursive: true });

const sqlite = global.solarStudioSqlite ?? new Database(dataPath);
sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
sqlite.function("gen_random_uuid", () => randomUUID());
sqlite.function("now", () => new Date().toISOString());
if (process.env.NODE_ENV !== "production") global.solarStudioSqlite = sqlite;

function compile(text: string, params: unknown[]) {
  const ordered: any[] = [];
  const sql = text
    .replace(/\$(\d+)/g, (_, index: string) => { ordered.push(params[Number(index) - 1]); return "?"; })
    .replace(/::(?:float8|int|numeric|date|text)\b/g, "");
  return { sql, ordered: ordered.map((value) => value instanceof Uint8Array ? Buffer.from(value) : value) };
}

export const query: Query = async <T = Row>(text: string, params: unknown[] = []) => {
  const { sql, ordered } = compile(text, params);
  const statement = sqlite.prepare(sql);
  const returnsRows = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
  const rows = returnsRows ? statement.all(...ordered) as T[] : (statement.run(...ordered), [] as T[]);
  return { rows };
};

export const database = {
  query,
  async transaction<T>(callback: (transaction: { query: Query }) => Promise<T>) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const result = await callback({ query });
      sqlite.exec("COMMIT");
      return result;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  },
};

export function dbError(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "The Solar Studio database is unavailable. Run npm run db:setup once, then restart the app." },
    { status: 503 },
  );
}
