import { dbError, query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(`
      SELECT p.*,
        COALESCE((SELECT sum(i.quantity * i.unit_price) FROM project_items i WHERE i.project_id = p.id), 0)::float8 AS equipment_cost,
        COALESCE((SELECT sum(c.amount) FROM project_costs c WHERE c.project_id = p.id AND COALESCE(c.cost_category, 'Installation') = 'Installation'), 0)::float8 AS soft_costs,
        COALESCE(r.monthly_customer_fee, 0)::float8 AS monthly_customer_fee,
        COALESCE(r.contract_years, 15) AS contract_years,
        (SELECT count(*)::int FROM project_items i WHERE i.project_id = p.id) AS item_count
      FROM projects p
      LEFT JOIN revenue_models r ON r.project_id = p.id
      ORDER BY p.created_at DESC
    `);
    return Response.json({ projects: result.rows });
  } catch (error) {
    return dbError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code || `SLX-${Date.now().toString().slice(-6)}`).toUpperCase();
    const result = await query(
      `INSERT INTO projects
        (code, name, customer_name, location, status, capacity_kw, annual_usage_kwh, electricity_rate,
         utility_escalation_pct, specific_yield_kwh_kw, degradation_pct, target_install_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULLIF($12,'')::date)
       RETURNING *`,
      [
        code,
        String(body.name || "Untitled solar project"),
        String(body.customer_name || ""),
        String(body.location || ""),
        String(body.status || "Prospect"),
        Number(body.capacity_kw || 0),
        Number(body.annual_usage_kwh || 0),
        Number(body.electricity_rate || 0),
        Number(body.utility_escalation_pct || 5),
        Number(body.specific_yield_kwh_kw || 1650),
        Number(body.degradation_pct || 0.5),
        String(body.target_install_date || ""),
      ],
    );
    const project = result.rows[0];
    await query(
      `INSERT INTO revenue_models (project_id, monthly_customer_fee, monthly_installer_payment, contract_years)
       VALUES ($1,$2,0,15)`,
      [project.id, Number(body.monthly_customer_fee || 0)],
    );
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
