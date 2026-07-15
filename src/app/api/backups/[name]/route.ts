import { deleteBackup, readBackup, restoreBackup } from "@/lib/backups";
import { dbError, query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const backup = await readBackup(name);
    return new Response(new Blob([backup.bytes]), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Length": String(backup.size),
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return dbError(error);
  }
}

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
