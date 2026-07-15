import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const allowed = ["Planned", "Quoted", "Ordered", "In transit", "Delivered", "Installed"];
    const current = await query("SELECT * FROM project_items WHERE id=$1", [id]);
    if (!current.rows[0]) return Response.json({ error: "Sourcing line not found" }, { status: 404 });
    const existing = current.rows[0];
    const status = body.status ?? existing.status;
    const quantity = body.quantity === undefined ? Number(existing.quantity) : Number(body.quantity);
    const unitPrice = body.unit_price === undefined ? Number(existing.unit_price) : Number(body.unit_price);
    const expectedDelivery = body.expected_delivery === undefined ? existing.expected_delivery : body.expected_delivery || null;
    if (!allowed.includes(status)) return Response.json({ error: "Invalid sourcing status" }, { status: 400 });
    if (!Number.isFinite(quantity) || quantity <= 0) return Response.json({ error: "Quantity must be greater than zero" }, { status: 400 });
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return Response.json({ error: "Unit price cannot be negative" }, { status: 400 });
    if (body.expected_delivery !== undefined && expectedDelivery !== null && !/^\d{4}-\d{2}-\d{2}$/.test(expectedDelivery)) return Response.json({ error: "Invalid expected delivery date" }, { status: 400 });
    const result = await query(
      `UPDATE project_items SET quantity=$2, unit_price=$3, supplier=$4, expected_delivery=$5, status=$6, notes=$7
       WHERE id=$1 RETURNING *`,
      [id, quantity, unitPrice, body.supplier ?? existing.supplier, expectedDelivery,
        status, body.notes ?? existing.notes],
    );
    if (!result.rows[0]) return Response.json({ error: "Sourcing line not found" }, { status: 404 });
    return Response.json({ item: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM project_items WHERE id = $1", [id]);
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
