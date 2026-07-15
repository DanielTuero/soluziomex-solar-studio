import Database from "better-sqlite3";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

type Row = Record<string, any>;
type Query = <T = Row>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;

declare global {
  // eslint-disable-next-line no-var
  var solarStudioSqlite: Database.Database | undefined;
}

const configuredPath = process.env.SOLAR_STUDIO_DATA_PATH ?? "./data/solar-studio.db";
export const dataPath = resolve(/* turbopackIgnore: true */ process.cwd(), configuredPath);
mkdirSync(dirname(dataPath), { recursive: true });

function openDatabase() {
  const connection = new Database(dataPath);
  connection.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  connection.function("gen_random_uuid", () => randomUUID());
  connection.function("now", () => new Date().toISOString());
  return connection;
}

let sqlite = global.solarStudioSqlite ?? openDatabase();
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

export async function backupDatabase(destination: string) {
  await sqlite.backup(destination);
}

const dataRestoreTables = ["products", "product_images", "projects", "revenue_models", "project_items", "project_costs", "cost_catalog", "partners", "project_partners", "partner_quotes", "audit_logs"];
const optionalDataRestoreTables = ["project_validation_payments"];
const securityRestoreTables = ["app_security", "app_users", "app_user_permissions"];

export function validateDatabaseBackup(source: string) {
  const check = new Database(source, { readonly: true });
  try {
    const result = check.pragma("quick_check") as Array<{ quick_check: string }>;
    if (result[0]?.quick_check !== "ok") throw new Error("The selected backup did not pass its database integrity check.");
    const available = new Set((check.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{name:string}>).map(row => row.name));
    const missing = dataRestoreTables.filter(table => !available.has(table));
    if (missing.length) throw new Error(`This is not a complete Solar Studio backup. Missing data: ${missing.join(", ")}.`);
  } finally {
    check.close();
  }
}

export function restoreDatabase(source: string) {
  validateDatabaseBackup(source);

  const dataDeleteOrder = ["project_validation_payments", "partner_quotes", "project_partners", "partners", "project_items", "project_costs", "revenue_models", "product_images", "cost_catalog", "projects", "products", "audit_logs"];
  const escapedSource = source.replace(/'/g, "''");
  sqlite.exec(`ATTACH DATABASE '${escapedSource}' AS restored`);
  try {
    const restoredTables = new Set((sqlite.prepare("SELECT name FROM restored.sqlite_master WHERE type='table'").all() as Array<{name:string}>).map(row => row.name));
    const missing = dataRestoreTables.filter(table => !restoredTables.has(table));
    if (missing.length) throw new Error(`This backup predates required Solar Studio data: ${missing.join(", ")}.`);
    const includesUserSecurity = securityRestoreTables.every(table => restoredTables.has(table));
    const optionalRestoreTables = optionalDataRestoreTables.filter(table => restoredTables.has(table));
    const restoreTables = includesUserSecurity ? [...dataRestoreTables, ...optionalRestoreTables, ...securityRestoreTables] : [...dataRestoreTables, ...optionalRestoreTables];
    const deleteOrder = includesUserSecurity ? ["app_user_permissions", "app_users", ...dataDeleteOrder, "app_security"] : dataDeleteOrder;

    sqlite.pragma("foreign_keys = OFF");
    sqlite.exec("BEGIN IMMEDIATE");
    for (const table of deleteOrder) sqlite.exec(`DELETE FROM main.${table}`);
    for (const table of restoreTables) {
      const mainColumns = (sqlite.prepare(`PRAGMA main.table_info(${table})`).all() as Array<{name:string}>).map(row => row.name);
      const restoredColumns = new Set((sqlite.prepare(`PRAGMA restored.table_info(${table})`).all() as Array<{name:string}>).map(row => row.name));
      const shared = mainColumns.filter(column => restoredColumns.has(column));
      const columns = shared.map(column => `"${column}"`).join(",");
      sqlite.exec(`INSERT INTO main.${table} (${columns}) SELECT ${columns} FROM restored.${table}`);
    }
    const violations = sqlite.pragma("foreign_key_check") as unknown[];
    if (violations.length) throw new Error("The backup contains invalid record relationships and was not restored.");
    sqlite.exec("COMMIT");
  } catch (error) {
    if (sqlite.inTransaction) sqlite.exec("ROLLBACK");
    throw error;
  } finally {
    sqlite.exec("DETACH DATABASE restored");
    sqlite.pragma("foreign_keys = ON");
    rmSync(`${source}-wal`, { force: true });
    rmSync(`${source}-shm`, { force: true });
  }
}

export function dbError(error: unknown) {
  console.error(error);
  return Response.json(
    { error: "The Solar Studio database is unavailable. Run npm run db:setup once, then restart the app." },
    { status: 503 },
  );
}
