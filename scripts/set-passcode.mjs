import { randomBytes, scryptSync } from "node:crypto";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const passcode = process.env.SOLAR_STUDIO_PASSCODE;
if (!passcode) throw new Error("Set SOLAR_STUDIO_PASSCODE before running this command.");

const dataPath = resolve(process.cwd(), process.env.SOLAR_STUDIO_DATA_PATH ?? "./data/solar-studio.db");
const salt = randomBytes(16).toString("hex");
const digest = scryptSync(passcode, salt, 64).toString("hex");
const database = new Database(dataPath);

try {
  database.prepare(`
    UPDATE app_security
    SET passcode_hash = ?, passcode_enabled = 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `).run(`scrypt$${salt}$${digest}`);
  console.log("Solar Studio passcode is enabled and stored securely.");
} finally {
  database.close();
}
