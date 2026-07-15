import { importBackup } from "@/lib/backups";
import { query } from "@/lib/db";

const maximumBackupSize = 250 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("backup");
    if (!(file instanceof File)) return Response.json({ error: "Choose a Solar Studio backup file." }, { status: 400 });
    if (!file.size) return Response.json({ error: "The selected backup file is empty." }, { status: 400 });
    if (file.size > maximumBackupSize) return Response.json({ error: "The selected backup is larger than 250 MB." }, { status: 413 });

    const backup = await importBackup(new Uint8Array(await file.arrayBuffer()));
    await query(
      "INSERT INTO audit_logs (entity_type, entity_name, action, details) VALUES ('Database', $1, 'Imported', 'External Solar Studio backup validated and saved locally')",
      [backup.name],
    );
    return Response.json({ backup }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The backup could not be imported.";
    return Response.json({ error: message }, { status: 400 });
  }
}
