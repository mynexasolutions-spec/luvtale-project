"use client";

import { useState } from "react";
import type { Category, ProductCard as ProductCardType } from "@/lib/types";
import ProductCard from "./ProductCard";

export default function TrendingSection({
  products,
  categories,
}: {
  products: ProductCardType[];
  categories: Category[];
}) {
  const [filter, setFilter] = useState("all");

  return (
    <>
      <div className="filter-bar-container">
        <button className={`filter-btn filter-btn-styled${filter === "all" ? " active" : ""}`} onClick={() => setFilter("all")}>
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`filter-btn filter-btn-styled${filter === cat.name.toLowerCase() ? " active" : ""}`}
            onClick={() => setFilter(cat.name.toLowerCase())}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="products-grid">
        {products
          .filter((p) => filter === "all" || p.category_name?.toLowerCase() === filter)
          .map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
      </div>
    </>
  );
}
