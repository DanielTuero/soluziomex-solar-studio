import { dbError, query } from "@/lib/db";

const receiptTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const maxReceiptBytes = 10 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const sourceType = String(form.get("source_type") || "Other");
    const sourceId = String(form.get("source_id") || "") || null;
    const actualAmount = Number(form.get("actual_amount"));
    const paidOn = String(form.get("paid_on") || "");
    const vendor = String(form.get("vendor") || "").trim();
    const notes = String(form.get("notes") || "").trim();
    if (!["Revenue", "OperatingExpense"].includes(sourceType)) return Response.json({ error:"Choose a valid revenue or operating expense line." }, { status:400 });
    if (!Number.isFinite(actualAmount) || actualAmount <= 0) return Response.json({ error:"Enter the actual amount received or paid." }, { status:400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return Response.json({ error:"Choose the transaction date." }, { status:400 });

    let label = String(form.get("label") || "").trim();
    const projectedValue = form.get("projected_amount");
    let projectedAmount = projectedValue === null ? Number.NaN : Number(projectedValue);
    if (sourceType === "Revenue") {
      const { rows } = await query<{monthly_customer_fee:number}>("SELECT monthly_customer_fee FROM revenue_models WHERE project_id=$1", [id]);
      if (!rows[0]) return Response.json({ error:"Save the customer revenue model before recording actual revenue." }, { status:404 });
      if (!Number.isFinite(projectedAmount) || projectedAmount < 0) projectedAmount=Number(rows[0].monthly_customer_fee);
      label="Customer revenue";
    } else if (sourceId) {
      const { rows } = await query<{label:string;amount:number}>("SELECT label, amount FROM project_costs WHERE id=$1 AND project_id=$2 AND cost_category='Maintenance'", [sourceId,id]);
      if (!rows[0]) return Response.json({ error:"That projected operating expense no longer exists." }, { status:404 });
      label=rows[0].label; projectedAmount=Number(rows[0].amount);
    } else {
      if (!label) return Response.json({ error:"Describe the operating expense." }, { status:400 });
      if (!Number.isFinite(projectedAmount) || projectedAmount < 0) return Response.json({ error:"Enter a valid projected amount." }, { status:400 });
      const project = await query("SELECT id FROM projects WHERE id=$1", [id]);
      if (!project.rows[0]) return Response.json({ error:"Project not found." }, { status:404 });
    }

    const receiptValue = form.get("receipt");
    const receipt = receiptValue instanceof File && receiptValue.size > 0 ? receiptValue : null;
    if (receipt && (!receiptTypes.has(receipt.type) || receipt.size > maxReceiptBytes)) {
      return Response.json({ error:"Attach a PDF, JPG, PNG, or WebP receipt or invoice up to 10 MB." }, { status:400 });
    }
    const receiptBytes = receipt ? Buffer.from(await receipt.arrayBuffer()) : null;
    const result = await query(
      `INSERT INTO project_validation_payments (project_id,source_type,source_id,label,projected_amount,actual_amount,vendor,paid_on,notes,receipt_name,receipt_mime,receipt_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id,project_id,source_type,source_id,label,projected_amount,actual_amount,vendor,paid_on,notes,receipt_name,receipt_mime,created_at`,
      [id,sourceType,sourceId,label,projectedAmount,actualAmount,vendor,paidOn,notes,receipt?.name||null,receipt?.type||null,receiptBytes],
    );
    return Response.json({ payment:{...result.rows[0],has_receipt:Boolean(receipt)} }, { status:201 });
  } catch (error) {
    return dbError(error);
  }
}
