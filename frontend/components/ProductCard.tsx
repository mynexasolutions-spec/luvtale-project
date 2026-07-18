"use client";

import Link from "next/link";
import Image from "next/image";
import type { ProductCard as ProductCardType } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

export default function ProductCard({ product }: { product: ProductCardType }) {
  const { addToCart, addToWishlist } = useAppState();

  return (
    <div className="product-card">
      <div className="trending-product-img-wrap">
        {product.badge && <span className="trending-badge">{product.badge}</span>}
        <div className="trending-img-container">
          {product.img_primary && (
            <Image
              src={product.img_primary}
              alt={product.name}
              fill
              className="product-image primary trending-img"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            />
          )}
        </div>
        <div className="product-card-actions">
          <Link href={`/product/${product.slug}`} className="quick-view-btn" prefetch={false}>
            Quick View
          </Link>
          <div className="action-icons">
            <button className="circle-btn" onClick={() => addToWishlist(product.id)} aria-label="Add to wishlist">
              <i className="far fa-heart"></i>
            </button>
            <button className="circle-btn" onClick={() => addToCart(product.id)} aria-label="Add to cart">
              <i className="fas fa-shopping-cart"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="product-info">
        <Link href={`/product/${product.slug}`} className="product-name" prefetch={false}>
          {product.name}
        </Link>
        <div className="price-rating-wrap">
          <div className="product-price">
            <span className="curr-price">₹{product.price}</span>
            {product.old_price && <span className="old-price">₹{product.old_price}</span>}
          </div>
          <div className="rating">
            {Array.from({ length: 5 }).map((_, i) => (
              <i key={i} className={`${i < product.rating ? "fas" : "far"} fa-star`} style={{ color: "var(--star-color)" }}></i>
            ))}
          </div>
        </div>
        <div className="product-mobile-actions">
          <Link href={`/product/${product.slug}`} className="btn-mobile-quickview" prefetch={false}>
            Quick View
          </Link>
          <div className="mobile-action-icons">
            <button className="mobile-circle-btn" onClick={() => addToWishlist(product.id)} aria-label="Add to wishlist">
              <i className="far fa-heart"></i>
            </button>
            <button className="mobile-circle-btn" onClick={() => addToCart(product.id)} aria-label="Add to cart">
              <i className="fas fa-shopping-cart"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
