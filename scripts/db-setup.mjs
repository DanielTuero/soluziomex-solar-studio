import { mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationDirectory = resolve(root, "db");
const configuredPath = process.env.SOLAR_STUDIO_DATA_PATH ?? "./data/solar-studio.db";
const dataPath = resolve(root, configuredPath);
await mkdir(dirname(dataPath), { recursive: true });

const db = new Database(dataPath);
db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;");
db.function("gen_random_uuid", () => randomUUID());
db.function("now", () => new Date().toISOString());
try {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const migrationFiles = (await readdir(migrationDirectory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  for (const name of migrationFiles) {
    const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE name = ?").get(name);
    if (applied) continue;
    const sql = await readFile(resolve(migrationDirectory, name), "utf8");
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean)) db.exec(statement);
      db.prepare("INSERT INTO schema_migrations (name) VALUES (?)").run(name);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      console.error(`Failed database migration ${name}`);
      throw error;
    }
  }
  const costColumns = db.prepare("PRAGMA table_info(project_costs)").all();
  if (!costColumns.some((column) => column.name === "cost_category")) {
    db.exec("ALTER TABLE project_costs ADD COLUMN cost_category text NOT NULL DEFAULT 'Installation' CHECK (cost_category IN ('Installation', 'Maintenance'))");
  }
  console.log("Solar Studio database is ready with sample products and projects.");
} finally {
  db.close();
}
