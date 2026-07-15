import { dbError, query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const requestedPage = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = 15;
    const count = await query<{ total: number }>(
      "SELECT count(*)::int AS total FROM audit_logs WHERE ($1='' OR entity_type=$1)",
      [type],
    );
    const total = Number(count.rows[0]?.total || 0);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, pages);
    const result = await query(
      `SELECT id, entity_type, entity_id, entity_name, action, details, created_at
       FROM audit_logs WHERE ($1='' OR entity_type=$1) ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [type, pageSize, (page - 1) * pageSize],
    );
    const types = await query<{ entity_type: string }>("SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type");
    return Response.json({ logs: result.rows, types: types.rows.map(row => row.entity_type), pagination: { page, pages, pageSize, total } });
  } catch (error) {
    return dbError(error);
  }
}
