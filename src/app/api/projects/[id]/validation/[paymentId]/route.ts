import { dbError, query } from "@/lib/db";

export async function DELETE(_:Request,{params}:{params:Promise<{id:string;paymentId:string}>}) {
  try {
    const {id,paymentId}=await params;
    const existing=await query("SELECT id FROM project_validation_payments WHERE id=$1 AND project_id=$2",[paymentId,id]);
    if(!existing.rows[0])return Response.json({error:"Payment record not found."},{status:404});
    await query("DELETE FROM project_validation_payments WHERE id=$1 AND project_id=$2",[paymentId,id]);
    return new Response(null,{status:204});
  } catch(error) {
    return dbError(error);
  }
}
