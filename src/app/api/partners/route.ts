import { database, dbError, query } from "@/lib/db";

function partnerValues(body: Record<string, unknown>) {
  const company = String(body.company_name || "").trim();
  const type = String(body.partner_type || "Installer");
  if (!company) throw new Error("Company name is required.");
  if (!["Installer", "CFE Technician", "Electrician", "CFE Office Contact"].includes(type)) throw new Error("Choose a valid contact category.");
  return [company, type, String(body.contact_name || "").trim(), String(body.email || "").trim(), String(body.phone || "").trim(), String(body.website || "").trim(), String(body.address || "").trim(), String(body.payment_terms || "").trim(), String(body.performance_notes || "").trim(), String(body.status || "Active")];
}

function projectLinks(body: Record<string, unknown>) {
  if (!Array.isArray(body.project_links)) return [];
  return body.project_links.filter((link): link is { project_id: string; relationship: string; installer_share_pct?: number; installer_share_terms?: string } => Boolean(link && typeof link === "object" && "project_id" in link && "relationship" in link));
}

export async function GET() {
  try {
    const [partners, projects, links, quotes] = await Promise.all([
      query(`SELECT id, company_name, partner_category AS partner_type, contact_name, email, phone, website, address, products_supplied,
        payment_terms, performance_notes, status
        FROM partners WHERE is_archived=false ORDER BY company_name`),
      query("SELECT id, code, name, status FROM projects ORDER BY name"),
      query("SELECT pp.partner_id, pp.project_id AS id, p.code, p.name, partners.partner_category AS relationship, pp.installer_share_pct::float8 AS installer_share_pct, pp.installer_share_terms FROM project_partners pp JOIN projects p ON p.id=pp.project_id JOIN partners ON partners.id=pp.partner_id WHERE pp.is_active=true ORDER BY p.name"),
      query("SELECT q.id, q.partner_id, q.project_id, p.name AS project_name, q.reference, q.quote_date, q.amount::float8 AS amount, q.status, q.notes FROM partner_quotes q LEFT JOIN projects p ON p.id=q.project_id ORDER BY q.quote_date DESC, q.created_at DESC"),
    ]);
    const enriched = partners.rows.map(partner => ({
      ...partner,
      projects: links.rows.filter((link: any) => link.partner_id === (partner as any).id),
      quotes: quotes.rows.filter((quote: any) => quote.partner_id === (partner as any).id),
    }));
    return Response.json({ partners: enriched, projects: projects.rows });
  } catch (error) {
    return dbError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const values = partnerValues(body);
    const partnerType = String(body.partner_type || "Installer");
    const partner = await database.transaction(async tx => {
      const result = await tx.query(
        `INSERT INTO partners (company_name, partner_type, partner_category, contact_name, email, phone, website, address, payment_terms, performance_notes, status)
         VALUES ($1,'Installer',$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, values,
      );
      for (const link of projectLinks(body)) {
        const share = partnerType === "Installer" ? Number(link.installer_share_pct || 0) : 0;
        if (!Number.isFinite(share) || share < 0 || share > 100) throw new Error("Each project installer share must be between 0% and 100%.");
        const assigned = await tx.query("SELECT COALESCE(SUM(pp.installer_share_pct),0)::float8 AS total FROM project_partners pp JOIN partners ON partners.id=pp.partner_id WHERE pp.project_id=$1 AND pp.is_active=true AND partners.is_archived=false AND partners.partner_category='Installer'", [link.project_id]);
        if (Number((assigned.rows[0] as any).total || 0) + share > 100) throw new Error("Installer revenue shares for a project cannot total more than 100%.");
        await tx.query("INSERT INTO project_partners (project_id, partner_id, relationship, installer_share_pct, installer_share_terms) VALUES ($1,$2,'Installer',$3,$4)", [link.project_id, (result.rows[0] as any).id, share, partnerType === "Installer" ? String(link.installer_share_terms || "").trim() : ""]);
      }
      return result.rows[0];
    });
    return Response.json({ partner }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /required|valid contact|installer share|revenue shares/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    return dbError(error);
  }
}
