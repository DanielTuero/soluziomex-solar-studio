import { createBackup, ensureDailyBackup, listBackups } from "@/lib/backups";
import { dbError } from "@/lib/db";

export async function GET() {
  try {
    await ensureDailyBackup();
    return Response.json({ backups: await listBackups() });
  } catch (error) {
    return dbError(error);
  }
}

export async function POST() {
  try {
    const backup = await createBackup("Manual");
    return Response.json({ backup }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
