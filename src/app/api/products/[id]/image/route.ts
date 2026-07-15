import { dbError, query } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query<{ mime_type: string; bytes: Uint8Array }>("SELECT mime_type, bytes FROM product_images WHERE product_id = $1", [id]);
    const image = result.rows[0];
    if (!image) return new Response(null, { status: 404 });
    return new Response(new Blob([image.bytes as BlobPart], { type: image.mime_type }), {
      headers: { "Content-Type": image.mime_type, "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    return dbError(error);
  }
}
