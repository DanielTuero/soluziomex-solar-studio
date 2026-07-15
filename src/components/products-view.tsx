"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Boxes, Edit3, ImagePlus, PackagePlus, Search, Trash2, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/economics";

const categories = ["Solar panels", "Inverters", "Racking", "Cables", "Electrical", "Monitoring", "Batteries", "Transformers", "Other"];
const availability = ["Available", "Low stock", "Backordered", "Discontinued"];

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/products")
    .then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setProducts(payload.products);
    })
    .catch((reason) => setError(reason.message))
    .finally(() => setLoading(false));

  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => products.filter((product) =>
    (category === "All" || product.category === category)
    && `${product.name} ${product.model} ${product.manufacturer} ${product.sku}`.toLowerCase().includes(search.toLowerCase()),
  ), [products, search, category]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isNew = editing === "new";
    const response = await fetch(isNew ? "/api/products" : `/api/products/${editing?.id}`, {
      method: isNew ? "POST" : "PATCH",
      body: form,
    });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error); return; }
    setEditing(null);
    await load();
  }

  async function remove(product: Product) {
    if (!confirm(`Remove ${product.name} from the catalog? Existing project line items will keep their product details.`)) return;
    const response = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error);
      return;
    }
    await load();
  }

  return <>
    <div className="page-heading">
      <div><p className="eyebrow">Sourcing library</p><h1>Product catalog</h1><p>Reusable equipment, current pricing, lead times, and supplier-ready specifications.</p></div>
      <button className="button primary" onClick={() => setEditing("new")}><PackagePlus size={16} />Add product</button>
    </div>
    {error && <div className="error-banner">{error}</div>}
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-header">
        <div><h2>Catalog overview</h2><p>{products.length} reusable product records</p></div>
        <div className="filters">
          <Search size={15} color="#819087" />
          <input className="filter-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search catalog…" />
          <select className="filter-input" style={{ minWidth: 140 }} value={category} onChange={(event) => setCategory(event.target.value)}><option>All</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
      </div>
    </section>
    {loading ? <div className="loading"><div><div className="spinner" />Loading products…</div></div>
      : visible.length ? <div className="catalog-grid">{visible.map((product) =>
        <article className="product-card" key={product.id}>
          <div className="product-image">{product.has_image ? <img src={`/api/products/${product.id}/image`} alt={product.name} /> : <Boxes size={38} />}</div>
          <div className="product-body">
            <span className="product-category">{product.category} · {product.sku}</span>
            <h3>{product.name}</h3>
            <div className="product-model">{product.manufacturer} · {product.model}</div>
            <div className="product-price"><div><strong>{money(Number(product.unit_cost))}</strong><small> per unit</small></div><span className={`status ${product.status.replace(" ", "-")}`}>{product.status}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, color: "#748179", fontSize: 9 }}><span>Lead time</span><strong>{product.lead_time_days} days</strong></div>
            <div className="product-actions">
              <button className="button secondary small" onClick={() => setEditing(product)}><Edit3 size={13} />Edit</button>
              <button className="button danger small" onClick={() => remove(product)}><Trash2 size={13} />Remove</button>
            </div>
          </div>
        </article>)}</div>
        : <div className="card empty-state"><Boxes size={30} /><h3>No products match</h3><p>Try another search or add the first product in this category.</p></div>}
    {editing && <ProductModal product={editing === "new" ? null : editing} close={() => setEditing(null)} submit={submit} />}
  </>;
}

function ProductModal({ product, close, submit }: { product: Product | null; close: () => void; submit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <div className="modal-backdrop">
    <form className="modal" onSubmit={submit}>
      <div className="modal-head"><div><p className="eyebrow">Catalog entry</p><h2>{product ? "Edit product" : "Add a reusable product"}</h2></div><button type="button" className="button ghost small" onClick={close}><X size={18} /></button></div>
      <div className="modal-body"><div className="form-grid">
        <Field name="sku" label="SKU" placeholder="PAN-MFG-600" defaultValue={product?.sku} required />
        <Field name="name" label="Product name" placeholder="N-type bifacial 600 W" defaultValue={product?.name} required />
        <Select name="category" label="Category" options={categories} defaultValue={product?.category} />
        <Field name="manufacturer" label="Manufacturer" defaultValue={product?.manufacturer} placeholder="Manufacturer" />
        <Field name="model" label="Model" defaultValue={product?.model} placeholder="Model number" />
        <Field name="unit_cost" label="Unit price (MXN)" type="number" step="0.01" defaultValue={product?.unit_cost} required />
        <Field name="lead_time_days" label="Lead time (days)" type="number" defaultValue={product?.lead_time_days ?? 14} />
        <Select name="status" label="Availability" options={availability} defaultValue={product?.status} />
        <div className="form-field full"><label>Description</label><textarea name="description" defaultValue={product?.description} placeholder="Technical notes, warranty, certifications…" /></div>
        <div className="form-field full"><label>{product?.has_image ? "Replace product image" : "Product image"}</label><label className="upload-box"><span><ImagePlus size={17} />{product?.has_image ? "Choose a replacement image" : "Upload JPG, PNG or WebP"}</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} /></label><span className="form-help">Leave empty to keep the current image. Maximum 5 MB.</span></div>
      </div></div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={close}>Cancel</button><button className="button primary">{product ? "Save changes" : "Save product"}</button></div>
    </form>
  </div>;
}

function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { const { label, ...rest } = props; return <div className="form-field"><label>{label}</label><input {...rest} /></div>; }
function Select({ name, label, options, defaultValue }: { name: string; label: string; options: string[]; defaultValue?: string }) { return <div className="form-field"><label>{label}</label><select name={name} defaultValue={defaultValue}>{options.map((item) => <option key={item}>{item}</option>)}</select></div>; }
