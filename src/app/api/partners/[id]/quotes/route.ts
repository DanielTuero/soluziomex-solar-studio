import { dbError, query } from "@/lib/db";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await query(
      `INSERT INTO partner_quotes (partner_id, project_id, reference, quote_date, amount, status, notes)
       VALUES ($1,NULLIF($2,''),$3,COALESCE(NULLIF($4,'')::date,CURRENT_DATE),$5,$6,$7)
       RETURNING *`,
      [id, String(body.project_id || ""), String(body.reference || "").trim(), String(body.quote_date || ""), Number(body.amount || 0), String(body.status || "Received"), String(body.notes || "").trim()],
    );
    return Response.json({ quote: result.rows[0] }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
