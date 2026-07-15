import { dbError, query } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const label = String(body.label || "").trim();
    const amount = Number(body.amount);
    const costCategory = body.cost_category === "Maintenance" ? "Maintenance" : "Installation";
    const maintenanceFrequency = String(body.maintenance_frequency || "Monthly");
    if (!label) return Response.json({ error: "Add a cost description." }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 0) return Response.json({ error: "Enter a valid cost amount." }, { status: 400 });
    if (!["Monthly", "Quarterly", "Semiannual", "Annual"].includes(maintenanceFrequency)) {
      return Response.json({ error: "Choose a valid maintenance frequency." }, { status: 400 });
    }
    const result = await query(
      "INSERT INTO project_costs (project_id, cost_category, cost_type, label, amount, maintenance_frequency, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
      [id, costCategory, "Project cost", label, amount, maintenanceFrequency, String(body.notes || "")],
    );
    return Response.json({ cost: result.rows[0] }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
