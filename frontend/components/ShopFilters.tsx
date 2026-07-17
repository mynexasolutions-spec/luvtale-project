"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";

function useFilterState() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categoryIds = searchParams.getAll("category");
  const subcategoryIds = searchParams.getAll("subcategory");
  const collections = searchParams.getAll("collection");
  const maxPrice = searchParams.get("max_price") || "10000";
  const sort = searchParams.get("sort") || "new";
  const noFilters = categoryIds.length === 0 && subcategoryIds.length === 0 && collections.length === 0;

  function navigate(params: URLSearchParams) {
    const qs = params.toString();
    router.push(`/shop${qs ? `?${qs}` : ""}`);
  }

  function toggleParam(key: "category" | "subcategory" | "collection", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    const current = params.getAll(key);
    params.delete(key);
    if (current.includes(value)) {
      current.filter((v) => v !== value).forEach((v) => params.append(key, v));
    } else {
      current.forEach((v) => params.append(key, v));
      params.append(key, value);
    }
    navigate(params);
  }

  function setMaxPrice(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (Number(value) < 10000) params.set("max_price", value);
    else params.delete("max_price");
    navigate(params);
  }

  function setSort(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "new") params.set("sort", value);
    else params.delete("sort");
    navigate(params);
  }

  function clearFilters() {
    router.push("/shop");
  }

  return { categoryIds, subcategoryIds, collections, maxPrice, sort, noFilters, toggleParam, setMaxPrice, setSort, clearFilters };
}

export function MobileShopFilters({ categories }: { categories: Category[] }) {
  const { categoryIds, collections, maxPrice, sort, noFilters, toggleParam, setMaxPrice, setSort, clearFilters } = useFilterState();
  const [priceOpen, setPriceOpen] = useState(false);

  return (
    <div className="mobile-filter-wrap">
      <div className="mobile-chips-scroll">
        <div className={`filter-chip${noFilters ? " active" : ""}`} onClick={clearFilters}>
          <i className={noFilters ? "fas fa-check-circle" : "far fa-circle"} style={{ marginRight: 6 }}></i> All
        </div>
        <div className={`filter-chip${collections.includes("trending") ? " active" : ""}`} onClick={() => toggleParam("collection", "trending")}>
          <i className={collections.includes("trending") ? "fas fa-check-square" : "far fa-square"} style={{ marginRight: 6 }}></i> Trending Now
        </div>
        <div className={`filter-chip${collections.includes("bestseller") ? " active" : ""}`} onClick={() => toggleParam("collection", "bestseller")}>
          <i className={collections.includes("bestseller") ? "fas fa-check-square" : "far fa-square"} style={{ marginRight: 6 }}></i> Best Sellers
        </div>
        {categories.map((cat) => (
          <div key={cat.id} className={`filter-chip${categoryIds.includes(String(cat.id)) ? " active" : ""}`} onClick={() => toggleParam("category", String(cat.id))}>
            <i className={categoryIds.includes(String(cat.id)) ? "fas fa-check-square" : "far fa-square"} style={{ marginRight: 6 }}></i> {cat.name}
          </div>
        ))}
      </div>
      <div className="mobile-filter-actions">
        <button className="m-action-btn" onClick={() => setPriceOpen((v) => !v)}>
          <i className="fas fa-sliders-h"></i> Price Range
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.75rem", color: "#999" }}>Sort:</span>
          <select
            className="m-sort-select"
            style={{ border: "none", fontWeight: 700, fontSize: "0.85rem", outline: "none", background: "none" }}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="new">Newest</option>
            <option value="low">Price: Low</option>
            <option value="high">Price: High</option>
          </select>
        </div>
      </div>
      {priceOpen && (
        <div className="price-popover" style={{ display: "block" }}>
          <h4 style={{ fontSize: "1rem", marginBottom: 15 }}>Price Range</h4>
          <input
            type="range"
            className="price-slider"
            min={0}
            max={10000}
            step={100}
            defaultValue={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <span style={{ fontWeight: 600 }}>
              ₹0 - <span>{Number(maxPrice) >= 10000 ? "₹10,000+" : `₹${maxPrice}`}</span>
            </span>
            <button className="btn btn-primary" style={{ padding: "5px 15px", fontSize: "0.8rem" }} onClick={() => setPriceOpen(false)}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DesktopShopSidebar({ categories }: { categories: Category[] }) {
  const { categoryIds, subcategoryIds, collections, maxPrice, sort, noFilters, toggleParam, setMaxPrice, setSort, clearFilters } = useFilterState();

  return (
    <aside className="shop-sidebar">
      <div className="sidebar-card">
        <h3>Categories</h3>
        <ul className="category-filter-list">
          <li>
            <label className="custom-checkbox">
              <input type="checkbox" checked={noFilters} onChange={clearFilters} />
              <span>All Products</span>
            </label>
          </li>
          {categories.map((cat) => (
            <li key={cat.id} style={{ marginBottom: 20 }}>
              <label className="custom-checkbox" style={{ fontWeight: 800, color: "var(--primary)" }}>
                <input
                  type="checkbox"
                  checked={categoryIds.includes(String(cat.id))}
                  onChange={() => toggleParam("category", String(cat.id))}
                />
                <span>{cat.name}</span>
              </label>
              {cat.subcategories.length > 0 && (
                <ul style={{ listStyle: "none", paddingLeft: 32, marginTop: 10 }}>
                  {cat.subcategories.map((sub) => (
                    <li key={sub.id} style={{ marginBottom: 8 }}>
                      <label className="custom-checkbox" style={{ fontSize: "0.85rem", fontWeight: 500, color: "#666" }}>
                        <input
                          type="checkbox"
                          checked={subcategoryIds.includes(String(sub.id))}
                          onChange={() => toggleParam("subcategory", String(sub.id))}
                        />
                        <span>{sub.name}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-card">
        <h3>Collection</h3>
        <ul className="category-filter-list">
          <li>
            <label className="custom-checkbox">
              <input type="checkbox" checked={collections.includes("trending")} onChange={() => toggleParam("collection", "trending")} />
              <span>Trending Now</span>
            </label>
          </li>
          <li>
            <label className="custom-checkbox">
              <input type="checkbox" checked={collections.includes("bestseller")} onChange={() => toggleParam("collection", "bestseller")} />
              <span>Best Sellers</span>
            </label>
          </li>
        </ul>
      </div>

      <div className="sidebar-card">
        <h3>Price Range</h3>
        <div className="price-range-wrap">
          <input
            type="range"
            className="price-slider"
            min={0}
            max={10000}
            step={100}
            defaultValue={maxPrice}
            onMouseUp={(e) => setMaxPrice((e.target as HTMLInputElement).value)}
            onTouchEnd={(e) => setMaxPrice((e.target as HTMLInputElement).value)}
          />
          <div className="price-labels">
            <span>₹0</span>
            <span>{Number(maxPrice) >= 10000 ? "₹10,000+" : `₹${maxPrice}`}</span>
          </div>
        </div>
      </div>

      <div className="sidebar-card">
        <h3>Sort By</h3>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="new">Newest First</option>
          <option value="low">Price: Low to High</option>
          <option value="high">Price: High to Low</option>
        </select>
      </div>
    </aside>
  );
}
