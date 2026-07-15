import { mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { backupDatabase, dataPath, restoreDatabase, validateDatabaseBackup } from "./db";
import type { DatabaseBackup } from "./types";

const backupDirectory = resolve(dirname(dataPath), "backups");

function stamp(date = new Date()) {
  return date.toISOString().replace(/:/g, "-").replace(/\.\d{3}Z$/, "Z");
}

function validName(name: string) {
  return /^solar-studio-(?:manual|auto|imported)-[A-Za-z0-9_-]+\.db$/.test(name);
}

export async function listBackups(): Promise<DatabaseBackup[]> {
  await mkdir(backupDirectory, { recursive: true });
  const names = (await readdir(backupDirectory)).filter(validName);
  const backups = await Promise.all(names.map(async name => {
    const details = await stat(resolve(backupDirectory, name));
    return {
      name,
      kind: name.startsWith("solar-studio-auto-") ? "Automatic" as const : name.startsWith("solar-studio-imported-") ? "Imported" as const : "Manual" as const,
      size: details.size,
      created_at: details.mtime.toISOString(),
    };
  }));
  return backups.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createBackup(kind: "Automatic" | "Manual") {
  await mkdir(backupDirectory, { recursive: true });
  const date = new Date();
  const suffix = kind === "Automatic" ? date.toISOString().slice(0, 10) : stamp(date);
  const name = `solar-studio-${kind === "Automatic" ? "auto" : "manual"}-${suffix}.db`;
  const destination = resolve(backupDirectory, name);
  const temporary = `${destination}.tmp`;
  await backupDatabase(temporary);
  await unlink(destination).catch(() => undefined);
  await rename(temporary, destination);
  return (await listBackups()).find(backup => backup.name === name)!;
}

export async function ensureDailyBackup() {
  const today = `solar-studio-auto-${new Date().toISOString().slice(0, 10)}.db`;
  const existing = await listBackups();
  if (existing.some(backup => backup.name === today)) return null;
  return createBackup("Automatic");
}

export async function restoreBackup(name: string) {
  if (!validName(name)) throw new Error("Invalid backup name.");
  const path = resolve(backupDirectory, name);
  await stat(path);
  await createBackup("Manual");
  restoreDatabase(path);
}

export async function readBackup(name: string) {
  if (!validName(name)) throw new Error("Invalid backup name.");
  const path = resolve(backupDirectory, name);
  const [bytes, details] = await Promise.all([readFile(path), stat(path)]);
  return { bytes, size: details.size };
}

export async function importBackup(bytes: Uint8Array) {
  await mkdir(backupDirectory, { recursive: true });
  const name = `solar-studio-imported-${stamp()}.db`;
  const destination = resolve(backupDirectory, name);
  const temporary = `${destination}.tmp`;
  try {
    await writeFile(temporary, bytes);
    validateDatabaseBackup(temporary);
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  return (await listBackups()).find(backup => backup.name === name)!;
}

export async function deleteBackup(name: string) {
  if (!validName(name)) throw new Error("Invalid backup name.");
  await unlink(resolve(backupDirectory, name));
}
