import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const current = await query("SELECT * FROM project_costs WHERE id = $1", [id]);
    if (!current.rows[0]) return Response.json({ error: "Cost line not found." }, { status: 404 });
    const existing = current.rows[0];
    const costCategory = body.cost_category === undefined ? String(existing.cost_category) : String(body.cost_category);
    if (!(["Installation", "Maintenance"] as const).includes(costCategory as "Installation" | "Maintenance")) {
      return Response.json({ error: "Choose Installation or Maintenance." }, { status: 400 });
    }
    const label = body.label === undefined ? String(existing.label) : String(body.label).trim();
    const amount = body.amount === undefined ? Number(existing.amount) : Number(body.amount);
    const maintenanceFrequency = body.maintenance_frequency === undefined ? String(existing.maintenance_frequency || "Monthly") : String(body.maintenance_frequency);
    const notes = body.notes === undefined ? String(existing.notes) : String(body.notes);
    if (!label) return Response.json({ error: "Add a cost description." }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0) return Response.json({ error: "Enter a valid cost amount." }, { status: 400 });
    if (!["Monthly", "Quarterly", "Semiannual", "Annual"].includes(maintenanceFrequency)) {
      return Response.json({ error: "Choose a valid maintenance frequency." }, { status: 400 });
    }
    const result = await query(
      "UPDATE project_costs SET cost_category = $1, label = $2, amount = $3, maintenance_frequency = $4, notes = $5 WHERE id = $6 RETURNING *",
      [costCategory, label, amount, maintenanceFrequency, notes, id],
    );
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
