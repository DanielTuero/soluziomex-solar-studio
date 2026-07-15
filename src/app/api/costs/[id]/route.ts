import { dbError, query } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM project_costs WHERE id = $1", [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
