import { dbError, query } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const product = await query("SELECT unit_cost FROM products WHERE id = $1", [body.product_id]);
    if (!product.rows[0]) return Response.json({ error: "Product not found" }, { status: 404 });
    const result = await query(
      `INSERT INTO project_items (project_id, product_id, quantity, unit_price, supplier, expected_delivery, status, notes)
       VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::date,$7,$8) RETURNING *`,
      [id, body.product_id, Number(body.quantity), Number(body.unit_price ?? product.rows[0].unit_cost), String(body.supplier || ""),
        String(body.expected_delivery || ""), String(body.status || "Planned"), String(body.notes || "")],
    );
    return Response.json({ item: result.rows[0] }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
