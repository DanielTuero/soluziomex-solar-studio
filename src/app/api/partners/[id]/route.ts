import { database, dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const company = String(body.company_name || "").trim();
    const type = String(body.partner_type || "Supplier");
    if (!company) return Response.json({ error: "Company name is required." }, { status: 400 });
    if (!["Supplier", "Installer", "Both"].includes(type)) return Response.json({ error: "Choose a valid partner type." }, { status: 400 });
    const partner = await database.transaction(async tx => {
      const result = await tx.query(
        `UPDATE partners SET company_name=$2, partner_type=$3, contact_name=$4, email=$5, phone=$6, website=$7, address=$8,
         products_supplied=$9, installer_share_pct=$10, installer_share_terms=$11, payment_terms=$12, performance_notes=$13, status=$14, updated_at=now()
         WHERE id=$1 AND is_archived=false RETURNING *`,
        [id, company, type, String(body.contact_name || "").trim(), String(body.email || "").trim(), String(body.phone || "").trim(), String(body.website || "").trim(), String(body.address || "").trim(), String(body.products_supplied || "").trim(), Number(body.installer_share_pct || 0), String(body.installer_share_terms || "").trim(), String(body.payment_terms || "").trim(), String(body.performance_notes || "").trim(), String(body.status || "Active")],
      );
      if (!result.rows[0]) throw new Error("Partner not found.");
      await tx.query("DELETE FROM project_partners WHERE partner_id=$1", [id]);
      if (Array.isArray(body.project_links)) for (const link of body.project_links) {
        if (link?.project_id && ["Supplier", "Installer"].includes(link.relationship)) await tx.query("INSERT INTO project_partners (project_id, partner_id, relationship) VALUES ($1,$2,$3)", [link.project_id, id, link.relationship]);
      }
      return result.rows[0];
    });
    return Response.json({ partner });
  } catch (error) {
    if (error instanceof Error && error.message === "Partner not found.") return Response.json({ error: error.message }, { status: 404 });
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query("UPDATE partners SET is_archived=true, updated_at=now() WHERE id=$1 AND is_archived=false RETURNING id", [id]);
    if (!result.rows[0]) return Response.json({ error: "Partner not found." }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
