import { dbError, query } from "@/lib/db";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const shareResult = await query(
      `SELECT COALESCE(SUM(pp.installer_share_pct),0)::float8 AS installer_share_pct
       FROM project_partners pp JOIN partners ON partners.id=pp.partner_id
       WHERE pp.project_id=$1 AND pp.is_active=true AND partners.is_archived=false AND partners.partner_category='Installer'`,
      [id],
    );
    const installerSharePct = Number((shareResult.rows[0] as { installer_share_pct: number }).installer_share_pct || 0);
    const monthlyInstallerPayment = Number(body.monthly_customer_fee || 0) * installerSharePct / 100;
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
        body.contract_years, monthlyInstallerPayment, body.annual_fee_escalation_pct, body.discount_rate_pct],
    );
    return Response.json({ revenue: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}
