import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await query(
      `UPDATE projects SET
        name = COALESCE($2, name), customer_name = COALESCE($3, customer_name), location = COALESCE($4, location),
        status = COALESCE($5, status), capacity_kw = COALESCE($6, capacity_kw),
        annual_usage_kwh = COALESCE($7, annual_usage_kwh), electricity_rate = COALESCE($8, electricity_rate),
        utility_escalation_pct = COALESCE($9, utility_escalation_pct),
        specific_yield_kwh_kw = COALESCE($10, specific_yield_kwh_kw), degradation_pct = COALESCE($11, degradation_pct),
        target_install_date = CASE WHEN $12::text IS NULL THEN target_install_date ELSE NULLIF($12,'')::date END,
        updated_at = now()
       WHERE id = $1 RETURNING *`,
      [id, body.name ?? null, body.customer_name ?? null, body.location ?? null, body.status ?? null,
        body.capacity_kw ?? null, body.annual_usage_kwh ?? null, body.electricity_rate ?? null,
        body.utility_escalation_pct ?? null, body.specific_yield_kwh_kw ?? null, body.degradation_pct ?? null,
        body.target_install_date ?? null],
    );
    if (!result.rows[0]) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({ project: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM projects WHERE id = $1", [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
