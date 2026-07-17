"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { ProductDetail, Review } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

function variationKey(ids: number[]) {
  return ids.slice().sort((a, b) => a - b).join("|");
}

function formatPrice(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function ProductDetailView({ product, reviews }: { product: ProductDetail; reviews: Review[] }) {
  const { addToCart, addToWishlist } = useAppState();

  const thumbs = useMemo(() => {
    const list: string[] = [product.img_primary || ""];
    product.images.forEach((img) => list.push(img));
    if (product.img_secondary) list.push(product.img_secondary);
    product.variations.forEach((v) => {
      if (v.img_primary) list.push(v.img_primary);
    });
    return list.filter(Boolean);
  }, [product]);

  const [mainImg, setMainImg] = useState(thumbs[0] || "");
  const [qty, setQty] = useState(1);
  const [selectedValues, setSelectedValues] = useState<Record<number, number | "">>({});

  const variationMap = useMemo(() => {
    const map: Record<string, (typeof product.variations)[number]> = {};
    product.variations.forEach((v) => {
      const ids = v.options.map((o) => o.attribute_value_id);
      if (ids.length === 0) return;
      map[variationKey(ids)] = v;
    });
    return map;
  }, [product]);

  const isVariable = product.product_type === "variable";
  const allSelected = isVariable && product.attributes.every((a) => selectedValues[a.id]);
  const selectedVariation = allSelected
    ? variationMap[variationKey(Object.values(selectedValues).filter((v): v is number => v !== ""))]
    : undefined;

  const displayPrice = selectedVariation?.price ?? product.price;
  const stockTarget = isVariable ? selectedVariation : { stock_status: product.stock_status, stock_count: product.stock_count };

  function selectAttrValue(attrId: number, valueId: number | "") {
    setSelectedValues((prev) => {
      const next = { ...prev, [attrId]: valueId };
      const ids = Object.values(next).filter((v): v is number => v !== "");
      const variation = variationMap[variationKey(ids)];
      if (variation?.img_primary) setMainImg(variation.img_primary);
      return next;
    });
  }

  const [activeTab, setActiveTab] = useState<"desc" | "details" | "care" | "shipping" | "reviews">("desc");

  return (
    <>
      <div className="product-detail-container">
        <div className="product-gallery">
          <div className="thumbs-grid">
            {thumbs.map((src, i) => (
              <div key={i} className={`thumb-card${mainImg === src ? " active" : ""}`} onClick={() => setMainImg(src)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`View ${i + 1}`} loading="lazy" />
              </div>
            ))}
          </div>
          <div className="main-img-box">
            {mainImg && (
              <Image id="main-view" src={mainImg} alt={product.name} width={800} height={1000} style={{ width: "100%", height: "auto" }} priority />
            )}
          </div>
        </div>

        <div className="product-info-panel">
          <span className="p-cat-badge">{product.category_name || "Luxury"}</span>

          <div className="pdp-rating-row">
            <span className="stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <i key={i} className={`${i < product.rating ? "fas" : "far"} fa-star`}></i>
              ))}
            </span>
            <span className="rating-val">(4.8/5)</span>
            {reviews.length > 0 && (
              <>
                <span className="sep">|</span>
                <span className="review-count">{reviews.length} reviews</span>
              </>
            )}
          </div>

          <h1 className="p-title-serif">{product.name}</h1>

          <div className="p-price-row" style={{ marginBottom: 20 }}>
            <span className="curr">{formatPrice(displayPrice)}</span>
            {product.old_price && <span className="old">{formatPrice(product.old_price)}</span>}
          </div>

          <div className="stock-status" style={{ marginBottom: 24 }}>
            {isVariable && !allSelected && (
              <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: "0.9rem" }}>
                <i className="fas fa-info-circle"></i> Select options to check availability
              </span>
            )}
            {isVariable && allSelected && !selectedVariation && (
              <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: "0.9rem" }}>
                <i className="fas fa-exclamation-circle"></i> Combination not available
              </span>
            )}
            {stockTarget && (!isVariable || selectedVariation) && (
              stockTarget.stock_status === "instock" ? (
                <span style={{ color: "var(--success)", fontWeight: 700, fontSize: "0.9rem" }}>
                  <i className="fas fa-check-circle"></i> In Stock{stockTarget.stock_count > 0 ? ` (${stockTarget.stock_count} available)` : ""}
                </span>
              ) : (
                <span style={{ color: "var(--primary)", fontWeight: 700, fontSize: "0.9rem" }}>
                  <i className="fas fa-times-circle"></i> Out of Stock
                </span>
              )
            )}
          </div>

          {isVariable && product.attributes.length > 0 && (
            <div className="attr-selectors-grid">
              {product.attributes.map((attr) => (
                <div className="attr-dropdown-group" key={attr.id}>
                  <span className="attr-dropdown-label">{attr.name}</span>
                  <select
                    className="attr-select"
                    value={selectedValues[attr.id] ?? ""}
                    onChange={(e) => selectAttrValue(attr.id, e.target.value ? Number(e.target.value) : "")}
                  >
                    <option value="">Select {attr.name}</option>
                    {attr.values.map((val) => (
                      <option key={val.id} value={val.id}>
                        {val.value}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          <div className="p-actions-row">
            <div className="qty-input-box">
              <button className="qty-btn-luxe" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                -
              </button>
              <div className="qty-display-val">{qty}</div>
              <button className="qty-btn-luxe" onClick={() => setQty((q) => q + 1)}>
                +
              </button>
            </div>
            <button
              className="add-to-bag-big"
              disabled={isVariable && !selectedVariation}
              onClick={() => addToCart(product.id, selectedVariation?.id ?? null)}
            >
              <i className="fas fa-shopping-bag"></i> Add to Bag
            </button>
            <div
              className="p-wish-btn"
              onClick={() => addToWishlist(product.id)}
              style={{ position: "static", display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, border: "1.5px solid var(--border)", borderRadius: 50, cursor: "pointer", transition: "all 0.3s ease" }}
            >
              <i className="far fa-heart" style={{ fontSize: "1.2rem" }}></i>
            </div>
          </div>

        </div>
      </div>

      <div className="pdp-shipping-strip">
        <div className="pdp-shipping-item">
          <i className="fas fa-shipping-fast"></i>
          <div>
            <span className="pdp-shipping-title">Free Shipping</span>
            <span className="pdp-shipping-sub">On all orders above ₹500</span>
          </div>
        </div>
        <div className="pdp-shipping-item">
          <i className="fas fa-undo"></i>
          <div>
            <span className="pdp-shipping-title">Easy Returns</span>
            <span className="pdp-shipping-sub">14-day return policy</span>
          </div>
        </div>
        <div className="pdp-shipping-item">
          <i className="fas fa-shield-alt"></i>
          <div>
            <span className="pdp-shipping-title">Secure Pay</span>
            <span className="pdp-shipping-sub">100% secure payments</span>
          </div>
        </div>
      </div>

      <div className="pdp-lower-row">
        <div className="product-tabs-section">
          <div className="tab-nav">
            <button className={`tab-btn${activeTab === "desc" ? " active" : ""}`} onClick={() => setActiveTab("desc")}>
              Description
            </button>
            <button className={`tab-btn${activeTab === "details" ? " active" : ""}`} onClick={() => setActiveTab("details")}>
              Details
            </button>
            <button className={`tab-btn${activeTab === "care" ? " active" : ""}`} onClick={() => setActiveTab("care")}>
              Care Guide
            </button>
            <button className={`tab-btn${activeTab === "shipping" ? " active" : ""}`} onClick={() => setActiveTab("shipping")}>
              Shipping &amp; Returns
            </button>
            {reviews.length > 0 && (
              <button className={`tab-btn${activeTab === "reviews" ? " active" : ""}`} onClick={() => setActiveTab("reviews")}>
                Reviews ({reviews.length})
              </button>
            )}
          </div>

          <div className={`tab-panel${activeTab === "desc" ? " active" : ""}`}>
            <div className="desc-content" dangerouslySetInnerHTML={{ __html: product.description_html }} />
          </div>

          <div className={`tab-panel${activeTab === "details" ? " active" : ""}`}>
            <div className="desc-content">
              <table>
                <tbody>
                  <tr>
                    <th>Category</th>
                    <td>{product.category_name || "Luxury"}</td>
                  </tr>
                  <tr>
                    <th>Product Type</th>
                    <td>{isVariable ? "Made to order (select size/color)" : "Ready to ship"}</td>
                  </tr>
                  {selectedVariation?.sku && (
                    <tr>
                      <th>SKU</th>
                      <td>{selectedVariation.sku}</td>
                    </tr>
                  )}
                  <tr>
                    <th>Availability</th>
                    <td>
                      {stockTarget?.stock_status === "instock"
                        ? "In Stock"
                        : isVariable && !selectedVariation
                          ? allSelected
                            ? "Combination not available"
                            : "Select options"
                          : "Out of Stock"}
                    </td>
                  </tr>
                  <tr>
                    <th>Rating</th>
                    <td>{product.rating} / 5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className={`tab-panel${activeTab === "care" ? " active" : ""}`}>
            <div className="desc-content">
              <ul>
                <li>Dry clean only to preserve embroidery, embellishments and delicate fabric.</li>
                <li>Store in a breathable garment bag, away from direct sunlight.</li>
                <li>Iron on reverse at low heat if required.</li>
                <li>Avoid direct contact with perfume, deodorant or water to prevent staining.</li>
                <li>Handle sequins, pearls and zari work gently to avoid snagging.</li>
              </ul>
            </div>
          </div>

          <div className={`tab-panel${activeTab === "shipping" ? " active" : ""}`}>
            <div className="desc-content">
              <h3>Shipping</h3>
              <p>Orders are processed and dispatched within 24 to 48 hours of confirmation. Delivery takes 3 to 5 business days for major metro cities and 5 to 7 business days for regional or remote areas.</p>
              <h3>Returns &amp; Exchanges</h3>
              <p>We accept returns for eligible items within 14 days of delivery, provided items are unused, unwashed and in original packaging with tags attached. Need a different size or color? Contact us within 7 days of delivery to request an exchange, subject to stock availability.</p>
            </div>
          </div>

          {reviews.length > 0 && (
            <div className={`tab-panel${activeTab === "reviews" ? " active" : ""}`}>
              <h3 style={{ fontFamily: "var(--font-family-display)", fontSize: "1.4rem", fontWeight: 800, marginBottom: 24, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fas fa-star" style={{ color: "#FFD700" }}></i> Customer Reviews
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                {reviews.map((review) => (
                  <div key={review.id} style={{ padding: 25, borderRadius: 15, background: "#FAF9F6", border: "1.5px solid #F0EDE8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--secondary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.9rem" }}>
                          {review.customer_name?.[0]}
                        </div>
                        <div>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--secondary)" }}>{review.customer_name}</h4>
                          <span style={{ fontSize: "0.8rem", color: "#999" }}>Verified Buyer</span>
                        </div>
                      </div>
                      <div style={{ color: "#FFD700", fontSize: "0.85rem" }}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <i key={i} className={`${i < review.rating ? "fas" : "far"} fa-star`}></i>
                        ))}
                      </div>
                    </div>
                    <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#555", margin: 0, fontStyle: "italic" }}>&quot;{review.comment}&quot;</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
