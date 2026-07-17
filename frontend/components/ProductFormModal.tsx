"use client";

import { useState } from "react";
import type { Category, UserProduct } from "@/lib/types";
import { apiFetch } from "@/lib/api";

const emptyForm = {
  name: "",
  category_id: "",
  price: "",
  old_price: "",
  stock_count: "10",
  badge: "",
  img_url: "",
  description: "",
  is_featured: false,
  is_trending: false,
  is_bestseller: false,
};

export default function ProductFormModal({
  categories,
  editingProduct,
  onClose,
  onSaved,
}: {
  categories: Category[];
  editingProduct: UserProduct | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() =>
    editingProduct
      ? {
          name: editingProduct.name,
          category_id: editingProduct.category_id ? String(editingProduct.category_id) : "",
          price: String(editingProduct.price),
          old_price: editingProduct.old_price ? String(editingProduct.old_price) : "",
          stock_count: String(editingProduct.stock_count),
          badge: editingProduct.badge || "",
          img_url: editingProduct.img_primary || "",
          description: editingProduct.description || "",
          is_featured: editingProduct.is_featured,
          is_trending: editingProduct.is_trending,
          is_bestseller: editingProduct.is_bestseller,
        }
      : emptyForm
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData();
    formData.set("name", form.name);
    formData.set("category_id", form.category_id);
    formData.set("price", form.price);
    formData.set("old_price", form.old_price);
    formData.set("stock_count", form.stock_count);
    formData.set("badge", form.badge);
    formData.set("img_url", form.img_url);
    formData.set("description", form.description);
    formData.set("is_featured", String(form.is_featured));
    formData.set("is_trending", String(form.is_trending));
    formData.set("is_bestseller", String(form.is_bestseller));
    if (file) formData.set("img_primary", file);

    const url = editingProduct ? `/api/user/products/edit/${editingProduct.id}` : "/api/user/products/add";
    try {
      const result = await apiFetch<{ success: boolean; message?: string }>(url, { method: "POST", body: formData });
      if (result.success) {
        onSaved();
      } else {
        alert(result.message || "Failed to save product.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred while saving the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 25, maxWidth: 600, width: "90%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1.5px solid #eee", paddingBottom: 12 }}>
          <h3 style={{ fontFamily: "var(--font-family-display)", fontWeight: 800, fontSize: "1.4rem", margin: 0, color: "#000" }}>
            {editingProduct ? "Edit Product" : "Add Product"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "1.8rem", lineHeight: 1, cursor: "pointer", color: "#aaa", padding: 5 }}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Product Name *</label>
              <input type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Category *</label>
              <select required value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, background: "#fff", fontFamily: "inherit", fontSize: "0.9rem" }}>
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 15, marginBottom: 15 }}>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Price (₹) *</label>
              <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Old Price (₹)</label>
              <input type="number" step="0.01" value={form.old_price} onChange={(e) => setForm((f) => ({ ...f, old_price: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
            </div>
            <div>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Stock Count *</label>
              <input type="number" required value={form.stock_count} onChange={(e) => setForm((f) => ({ ...f, stock_count: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
            </div>
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Badge (e.g. &apos;New&apos;, &apos;Hot&apos;, &apos;Sale&apos;)</label>
            <input type="text" placeholder="Optional label badge" value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: 15 }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Upload Product Image</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ width: "100%", padding: 8, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem", marginBottom: 8 }} />
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Or Image URL</label>
            <input type="text" placeholder="Paste external image link" value={form.img_url} onChange={(e) => setForm((f) => ({ ...f, img_url: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem" }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: "0.85rem", display: "block", marginBottom: 5, color: "#333" }}>Description</label>
            <textarea rows={3} placeholder="Describe the item's details..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ width: "100%", padding: 10, border: "1.5px solid var(--border)", borderRadius: 8, fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical" }} />
          </div>

          <div style={{ display: "flex", gap: 15, marginBottom: 25, alignItems: "center", background: "#fafafa", padding: 12, borderRadius: 8, border: "1px solid #eee" }}>
            <label style={{ fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#555", margin: 0 }}>
              <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} style={{ width: 16, height: 16 }} /> Featured
            </label>
            <label style={{ fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#555", margin: 0 }}>
              <input type="checkbox" checked={form.is_trending} onChange={(e) => setForm((f) => ({ ...f, is_trending: e.target.checked }))} style={{ width: 16, height: 16 }} /> Trending
            </label>
            <label style={{ fontWeight: 600, fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: "#555", margin: 0 }}>
              <input type="checkbox" checked={form.is_bestseller} onChange={(e) => setForm((f) => ({ ...f, is_bestseller: e.target.checked }))} style={{ width: 16, height: 16 }} /> Bestseller
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", borderTop: "1.5px solid #eee", paddingTop: 15 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 700 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: "10px 25px", borderRadius: 8, cursor: "pointer", fontWeight: 700, background: "var(--primary)", color: "#fff", border: "none" }}>
              {saving ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
