import { dbError, query } from "@/lib/db";
import { normalizeScenarioYears } from "@/lib/timeframes";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [projectResult, itemsResult, costsResult, revenueResult, productsResult, costCatalogResult, installersResult, validationResult] = await Promise.all([
      query("SELECT * FROM projects WHERE id = $1", [id]),
      query(`SELECT i.*, p.name AS product_name, p.model AS product_model, p.category AS product_category, p.sku AS product_sku
             FROM project_items i JOIN products p ON p.id = i.product_id WHERE i.project_id = $1 ORDER BY i.created_at`, [id]),
      query("SELECT * FROM project_costs WHERE project_id = $1 ORDER BY created_at", [id]),
      query("SELECT * FROM revenue_models WHERE project_id = $1", [id]),
      query(`SELECT p.*, (pi.product_id IS NOT NULL) AS has_image FROM products p
             LEFT JOIN product_images pi ON pi.product_id = p.id WHERE p.is_archived = false ORDER BY p.category, p.name`),
      query("SELECT id, name, description FROM cost_catalog WHERE is_archived=false ORDER BY name"),
      query(`SELECT partners.id, partners.company_name, partners.contact_name,
                    pp.installer_share_pct::float8 AS installer_share_pct, pp.installer_share_terms
             FROM project_partners pp
             JOIN partners ON partners.id=pp.partner_id
             WHERE pp.project_id=$1 AND pp.is_active=true AND partners.is_archived=false
               AND partners.partner_category='Installer'
             ORDER BY partners.company_name`, [id]),
      query(`SELECT id, project_id, source_type, source_id, label, projected_amount, actual_amount, vendor, paid_on, notes,
                    receipt_name, receipt_mime, (receipt_bytes IS NOT NULL) AS has_receipt, created_at
             FROM project_validation_payments
             WHERE project_id=$1 AND source_type IN ('Revenue','OperatingExpense')
             ORDER BY paid_on DESC, created_at DESC`, [id]),
    ]);
    if (!projectResult.rows[0]) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({
      project: projectResult.rows[0], items: itemsResult.rows, costs: costsResult.rows, installers: installersResult.rows,
      revenue: revenueResult.rows[0] ? {...revenueResult.rows[0],contract_scenario_years:normalizeScenarioYears((revenueResult.rows[0] as {contract_scenario_years?:unknown}).contract_scenario_years,(revenueResult.rows[0] as {contract_years?:number}).contract_years)} : null, products: productsResult.rows, costCatalog: costCatalogResult.rows,
      validationPayments: validationResult.rows.map(payment => ({ ...payment, has_receipt:Boolean(payment.has_receipt) })),
    });
  } catch (error) {
    return dbError(error);
  }
}
