import { dbError, query } from "@/lib/db";

type ReceiptRow={receipt_name:string|null;receipt_mime:string|null;receipt_bytes:Uint8Array|null};

export async function GET(_:Request,{params}:{params:Promise<{id:string;paymentId:string}>}) {
  try {
    const {id,paymentId}=await params;
    const {rows}=await query<ReceiptRow>("SELECT receipt_name,receipt_mime,receipt_bytes FROM project_validation_payments WHERE id=$1 AND project_id=$2",[paymentId,id]);
    const receipt=rows[0];
    if(!receipt?.receipt_bytes)return Response.json({error:"No receipt is attached to this payment."},{status:404});
    const safeName=(receipt.receipt_name||"receipt").replace(/["\r\n]/g,"_");
    return new Response(new Uint8Array(receipt.receipt_bytes),{headers:{"Content-Type":receipt.receipt_mime||"application/octet-stream","Content-Disposition":`inline; filename="${safeName}"`,"Cache-Control":"private, no-store"}});
  } catch(error) {
    return dbError(error);
  }
}
