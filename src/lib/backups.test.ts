import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, test } from "vitest";

const requiredTables = ["products", "product_images", "projects", "revenue_models", "project_items", "project_costs", "cost_catalog", "partners", "project_partners", "partner_quotes", "app_security", "audit_logs"];

describe("portable database backups", () => {
  let backups: typeof import("./backups");

  beforeAll(async () => {
    const directory = await mkdtemp(join(tmpdir(), "solar-studio-backups-"));
    process.env.SOLAR_STUDIO_DATA_PATH = join(directory, "solar-studio.db");
    const db = await import("./db");
    for (const table of requiredTables) await db.query(`CREATE TABLE ${table} (id text)`);
    backups = await import("./backups");
  });

  test("creates a downloadable snapshot that can be imported later", async () => {
    const created = await backups.createBackup("Manual");
    const exported = await backups.readBackup(created.name);
    const imported = await backups.importBackup(exported.bytes);
    const listed = await backups.listBackups();

    expect(exported.size).toBeGreaterThan(0);
    expect(imported.kind).toBe("Imported");
    expect(listed.some(backup => backup.name === imported.name)).toBe(true);
  });

  test("rejects a file that is not a Solar Studio database", async () => {
    await expect(backups.importBackup(new TextEncoder().encode("not a sqlite database"))).rejects.toThrow();
  });
});
