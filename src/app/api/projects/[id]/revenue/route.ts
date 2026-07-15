import { dbError, query } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (Number(body.monthly_installer_payment) < 0) return Response.json({ error: "Installer payment cannot be negative." }, { status: 400 });
    const result = await query(
      `INSERT INTO revenue_models
       (project_id, previous_cfe_monthly_bill, residual_cfe_monthly_bill, monthly_customer_fee, contract_years, monthly_installer_payment, annual_fee_escalation_pct, discount_rate_pct)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (project_id) DO UPDATE SET previous_cfe_monthly_bill=EXCLUDED.previous_cfe_monthly_bill,
       residual_cfe_monthly_bill=EXCLUDED.residual_cfe_monthly_bill, monthly_customer_fee=EXCLUDED.monthly_customer_fee,
       contract_years=EXCLUDED.contract_years, monthly_installer_payment=EXCLUDED.monthly_installer_payment,
       annual_fee_escalation_pct=EXCLUDED.annual_fee_escalation_pct, discount_rate_pct=EXCLUDED.discount_rate_pct, updated_at=now()
       RETURNING *`,
      [id, body.previous_cfe_monthly_bill, body.residual_cfe_monthly_bill, body.monthly_customer_fee,
        body.contract_years, body.monthly_installer_payment, body.annual_fee_escalation_pct, body.discount_rate_pct],
    );
    return Response.json({ revenue: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}
