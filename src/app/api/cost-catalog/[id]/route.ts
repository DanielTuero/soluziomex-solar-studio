import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return Response.json({ error: "Cost name is required." }, { status: 400 });
    const result = await query(
      `UPDATE cost_catalog SET name=$2, description=$3, updated_at=now()
       WHERE id=$1 AND is_archived=false RETURNING id, name, description`,
      [id, name, String(body.description || "").trim()],
    );
    if (!result.rows[0]) return Response.json({ error: "Cost template not found." }, { status: 404 });
    return Response.json({ cost: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query("UPDATE cost_catalog SET is_archived=true, updated_at=now() WHERE id=$1 RETURNING id", [id]);
    if (!result.rows[0]) return Response.json({ error: "Cost template not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
