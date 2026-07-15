import { dbError, database, query } from "@/lib/db";
import { normalizeProductSource } from "@/lib/product-source";

function validateImage(image: FormDataEntryValue | null) {
  if (!(image instanceof File) || image.size === 0) return null;
  if (image.size > 5 * 1024 * 1024) return "Images must be 5 MB or smaller.";
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) return "Use a JPG, PNG, or WebP image.";
  return null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const source = normalizeProductSource(form.get("source_url"));
    if (source.error) return Response.json({ error: source.error }, { status: 400 });
    const image = form.get("image");
    const imageError = validateImage(image);
    if (imageError) return Response.json({ error: imageError }, { status: 400 });

    const result = await database.transaction(async (tx) => {
      const updated = await tx.query<Record<string, unknown>>(
        `UPDATE products SET sku=$2, name=$3, category=$4, manufacturer=$5, model=$6,
         unit_cost=$7, status=$8, description=$9, source_url=$10, updated_at=now()
         WHERE id=$1 AND is_archived=false RETURNING *`,
        [id, String(form.get("sku") || "").toUpperCase(), String(form.get("name") || ""),
          String(form.get("category") || "Other"), String(form.get("manufacturer") || ""),
          String(form.get("model") || ""), Number(form.get("unit_cost") || 0),
          String(form.get("status") || "Available"), String(form.get("description") || ""), source.url],
      );
      if (!updated.rows[0]) throw new Error("Product not found");
      if (image instanceof File && image.size > 0) {
        await tx.query(
          `INSERT INTO product_images (product_id, mime_type, bytes, file_name) VALUES ($1,$2,$3,$4)
           ON CONFLICT (product_id) DO UPDATE SET mime_type=EXCLUDED.mime_type, bytes=EXCLUDED.bytes,
           file_name=EXCLUDED.file_name, uploaded_at=now()`,
          [id, image.type, new Uint8Array(await image.arrayBuffer()), image.name],
        );
      }
      return updated;
    });
    return Response.json({ product: result.rows[0] });
  } catch (error) {
    return dbError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await query("UPDATE products SET is_archived=true, updated_at=now() WHERE id=$1 RETURNING id", [id]);
    if (!result.rows[0]) return Response.json({ error: "Product not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (error) {
    return dbError(error);
  }
}
