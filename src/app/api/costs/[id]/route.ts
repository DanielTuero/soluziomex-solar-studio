import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const costCategory = String(body.cost_category || "");
    if (!(["Installation", "Maintenance"] as const).includes(costCategory as "Installation" | "Maintenance")) {
      return Response.json({ error: "Choose Installation or Maintenance." }, { status: 400 });
    }
    const result = await query(
      "UPDATE project_costs SET cost_category = $1 WHERE id = $2 RETURNING *",
      [costCategory, id],
    );
    if (!result.rows[0]) return Response.json({ error: "Cost line not found." }, { status: 404 });
    return Response.json({ cost: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM project_costs WHERE id = $1", [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
