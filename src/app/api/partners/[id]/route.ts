import { database, dbError, query } from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const company = String(body.company_name || "").trim();
    const type = String(body.partner_type || "Installer");
    if (!company) return Response.json({ error: "Company name is required." }, { status: 400 });
    if (!["Installer", "CFE Technician", "Electrician", "CFE Office Contact"].includes(type)) return Response.json({ error: "Choose a valid contact category." }, { status: 400 });
    const partner = await database.transaction(async tx => {
      const result = await tx.query(
        `UPDATE partners SET company_name=$2, partner_type='Installer', partner_category=$3, contact_name=$4, email=$5, phone=$6, website=$7, address=$8,
         products_supplied='', installer_share_pct=0, installer_share_terms='', payment_terms=$9, performance_notes=$10, status=$11, updated_at=now()
         WHERE id=$1 AND is_archived=false RETURNING *`,
        [id, company, type, String(body.contact_name || "").trim(), String(body.email || "").trim(), String(body.phone || "").trim(), String(body.website || "").trim(), String(body.address || "").trim(), String(body.payment_terms || "").trim(), String(body.performance_notes || "").trim(), String(body.status || "Active")],
      );
      if (!result.rows[0]) throw new Error("Partner not found.");
      await tx.query("DELETE FROM project_partners WHERE partner_id=$1", [id]);
      if (Array.isArray(body.project_links)) for (const link of body.project_links) {
        if (!link?.project_id) continue;
        const share = type === "Installer" ? Number(link.installer_share_pct || 0) : 0;
        if (!Number.isFinite(share) || share < 0 || share > 100) throw new Error("Each project installer share must be between 0% and 100%.");
        const assigned = await tx.query("SELECT COALESCE(SUM(pp.installer_share_pct),0)::float8 AS total FROM project_partners pp JOIN partners ON partners.id=pp.partner_id WHERE pp.project_id=$1 AND pp.is_active=true AND partners.is_archived=false AND partners.partner_category='Installer'", [link.project_id]);
        if (Number((assigned.rows[0] as any).total || 0) + share > 100) throw new Error("Installer revenue shares for a project cannot total more than 100%.");
        await tx.query("INSERT INTO project_partners (project_id, partner_id, relationship, installer_share_pct, installer_share_terms) VALUES ($1,$2,'Installer',$3,$4)", [link.project_id, id, share, type === "Installer" ? String(link.installer_share_terms || "").trim() : ""]);
      }
      return result.rows[0];
    });
    return Response.json({ partner });
  } catch (error) {
    if (error instanceof Error && error.message === "Partner not found.") return Response.json({ error: error.message }, { status: 404 });
    if (error instanceof Error && /installer share|revenue shares/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
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
