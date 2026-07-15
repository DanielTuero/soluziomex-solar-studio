import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sql = await readFile(resolve(root, "db/001_initial.sql"), "utf8");
const configuredPath = process.env.SOLAR_STUDIO_DATA_PATH ?? "./data/solar-studio.db";
const dataPath = resolve(root, configuredPath);
await mkdir(dirname(dataPath), { recursive: true });

const db = new Database(dataPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
db.function("gen_random_uuid", () => randomUUID());
db.function("now", () => new Date().toISOString());
try {
  for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) {
    try { db.exec(statement); }
    catch (error) { console.error("Failed database statement:\n", statement.slice(0, 500)); throw error; }
  }
  const costColumns = db.prepare("PRAGMA table_info(project_costs)").all();
  if (!costColumns.some((column) => column.name === "cost_category")) {
    db.exec("ALTER TABLE project_costs ADD COLUMN cost_category text NOT NULL DEFAULT 'Installation' CHECK (cost_category IN ('Installation', 'Maintenance'))");
  }
  console.log("Solar Studio database is ready with sample products and projects.");
} finally {
  db.close();
}
