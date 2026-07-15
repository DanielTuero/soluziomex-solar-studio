import { dbError, query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const [projectResult, itemsResult, costsResult, revenueResult, productsResult, costCatalogResult] = await Promise.all([
      query("SELECT * FROM projects WHERE id = $1", [id]),
      query(`SELECT i.*, p.name AS product_name, p.model AS product_model, p.category AS product_category, p.sku AS product_sku
             FROM project_items i JOIN products p ON p.id = i.product_id WHERE i.project_id = $1 ORDER BY i.created_at`, [id]),
      query("SELECT * FROM project_costs WHERE project_id = $1 ORDER BY created_at", [id]),
      query("SELECT * FROM revenue_models WHERE project_id = $1", [id]),
      query(`SELECT p.*, (pi.product_id IS NOT NULL) AS has_image FROM products p
             LEFT JOIN product_images pi ON pi.product_id = p.id WHERE p.is_archived = false ORDER BY p.category, p.name`),
      query("SELECT id, name, description FROM cost_catalog WHERE is_archived=false ORDER BY name"),
    ]);
    if (!projectResult.rows[0]) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({
      project: projectResult.rows[0], items: itemsResult.rows, costs: costsResult.rows,
      revenue: revenueResult.rows[0], products: productsResult.rows, costCatalog: costCatalogResult.rows,
    });
  } catch (error) {
    return dbError(error);
  }
}
