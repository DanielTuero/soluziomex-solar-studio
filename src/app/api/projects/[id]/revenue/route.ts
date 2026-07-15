import { dbError, query } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const total = Number(body.installer_share_pct) + Number(body.maintenance_reserve_pct) + Number(body.platform_share_pct);
    if (Math.abs(total - 100) > 0.001) return Response.json({ error: "Revenue shares must total 100%." }, { status: 400 });
    const result = await query(
      `INSERT INTO revenue_models
       (project_id, previous_cfe_monthly_bill, residual_cfe_monthly_bill, monthly_customer_fee, contract_years, installer_share_pct, maintenance_reserve_pct, platform_share_pct, annual_fee_escalation_pct, discount_rate_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (project_id) DO UPDATE SET previous_cfe_monthly_bill=EXCLUDED.previous_cfe_monthly_bill,
       residual_cfe_monthly_bill=EXCLUDED.residual_cfe_monthly_bill, monthly_customer_fee=EXCLUDED.monthly_customer_fee,
       contract_years=EXCLUDED.contract_years, installer_share_pct=EXCLUDED.installer_share_pct,
       maintenance_reserve_pct=EXCLUDED.maintenance_reserve_pct, platform_share_pct=EXCLUDED.platform_share_pct,
       annual_fee_escalation_pct=EXCLUDED.annual_fee_escalation_pct, discount_rate_pct=EXCLUDED.discount_rate_pct, updated_at=now()
       RETURNING *`,
      [id, body.previous_cfe_monthly_bill, body.residual_cfe_monthly_bill, body.monthly_customer_fee,
        body.contract_years, body.installer_share_pct, body.maintenance_reserve_pct,
        body.platform_share_pct, body.annual_fee_escalation_pct, body.discount_rate_pct],
    );
    return Response.json({ revenue: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}
