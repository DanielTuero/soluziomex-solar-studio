import { dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await query(
      `UPDATE partner_quotes SET project_id=NULLIF($2,''), reference=$3, quote_date=COALESCE(NULLIF($4,'')::date,quote_date), amount=$5, status=$6, notes=$7, updated_at=now()
       WHERE id=$1 RETURNING *`,
      [id, String(body.project_id || ""), String(body.reference || "").trim(), String(body.quote_date || ""), Number(body.amount || 0), String(body.status || "Received"), String(body.notes || "").trim()],
    );
    if (!result.rows[0]) return Response.json({ error: "Quote not found." }, { status: 404 });
    return Response.json({ quote: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query("DELETE FROM partner_quotes WHERE id=$1 RETURNING id", [id]);
    if (!result.rows[0]) return Response.json({ error: "Quote not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
