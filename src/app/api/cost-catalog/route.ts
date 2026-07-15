import { dbError, query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query("SELECT id, name, description FROM cost_catalog WHERE is_archived=false ORDER BY name");
    return Response.json({ costs: result.rows });
  } catch (error) {
    return dbError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return Response.json({ error: "Cost name is required." }, { status: 400 });
    const result = await query(
      "INSERT INTO cost_catalog (name, description) VALUES ($1,$2) RETURNING id, name, description",
      [name, String(body.description || "").trim()],
    );
    return Response.json({ cost: result.rows[0] }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
