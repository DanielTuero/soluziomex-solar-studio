import { deleteBackup, restoreBackup } from "@/lib/backups";
import { dbError, query } from "@/lib/db";

export async function POST(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    await restoreBackup(name);
    await query(
      "INSERT INTO audit_logs (entity_type, entity_name, action, details) VALUES ('Database', $1, 'Restored', 'Workspace restored from a dated backup; a safety snapshot was created first')",
      [name],
    );
    return Response.json({ restored: true });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    await deleteBackup(name);
    await query(
      "INSERT INTO audit_logs (entity_type, entity_name, action, details) VALUES ('Database', $1, 'Removed', 'Database backup deleted')",
      [name],
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
