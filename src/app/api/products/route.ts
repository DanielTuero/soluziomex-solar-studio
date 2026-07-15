import { dbError, database, query } from "@/lib/db";
import { normalizeProductSource } from "@/lib/product-source";

export async function GET() {
  try {
    const result = await query(`
      SELECT p.*, (pi.product_id IS NOT NULL) AS has_image
      FROM products p LEFT JOIN product_images pi ON pi.product_id = p.id
      WHERE p.is_archived = false
      ORDER BY p.category, p.name
    `);
    return Response.json({ products: result.rows });
  } catch (error) {
    return dbError(error);
  }
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const source = normalizeProductSource(form.get("source_url"));
    if (source.error) return Response.json({ error: source.error }, { status: 400 });
    const image = form.get("image");
    if (image instanceof File && image.size > 5 * 1024 * 1024) {
      return Response.json({ error: "Images must be 5 MB or smaller." }, { status: 400 });
    }
    if (image instanceof File && !["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      return Response.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    }
    const result = await database.transaction(async (tx) => {
      const inserted = await tx.query<Record<string, unknown>>(
        `INSERT INTO products (sku, name, category, manufacturer, model, unit_cost, currency, status, description, source_url)
         VALUES ($1,$2,$3,$4,$5,$6,'MXN',$7,$8,$9) RETURNING *`,
        [String(form.get("sku") || "").toUpperCase(), String(form.get("name") || ""), String(form.get("category") || "Other"),
          String(form.get("manufacturer") || ""), String(form.get("model") || ""), Number(form.get("unit_cost") || 0),
          String(form.get("status") || "Available"), String(form.get("description") || ""), source.url],
      );
      if (image instanceof File && image.size > 0) {
        await tx.query("INSERT INTO product_images (product_id, mime_type, bytes, file_name) VALUES ($1,$2,$3,$4)",
          [inserted.rows[0].id, image.type, new Uint8Array(await image.arrayBuffer()), image.name]);
      }
      return inserted;
    });
    return Response.json({ product: { ...result.rows[0], has_image: image instanceof File && image.size > 0 } }, { status: 201 });
  } catch (error) {
    return dbError(error);
  }
}
