import { dbError, query } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const result = await query(
      `SELECT id, entity_type, entity_id, entity_name, action, details, created_at
       FROM audit_logs WHERE ($1='' OR entity_type=$1) ORDER BY created_at DESC LIMIT 300`,
      [type],
    );
    const types = await query<{ entity_type: string }>("SELECT DISTINCT entity_type FROM audit_logs ORDER BY entity_type");
    return Response.json({ logs: result.rows, types: types.rows.map(row => row.entity_type) });
  } catch (error) {
    return dbError(error);
  }
}
