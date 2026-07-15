import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allowed = ["Planned", "Quoted", "Ordered", "In transit", "Delivered", "Installed"];
    if (!allowed.includes(body.status)) return Response.json({ error: "Invalid sourcing status" }, { status: 400 });
    const result = await query("UPDATE project_items SET status=$2 WHERE id=$1 RETURNING *", [id, body.status]);
    if (!result.rows[0]) return Response.json({ error: "Sourcing line not found" }, { status: 404 });
    return Response.json({ item: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM project_items WHERE id = $1", [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
