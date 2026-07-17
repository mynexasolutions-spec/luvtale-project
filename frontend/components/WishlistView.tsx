"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { WishlistData } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

export default function WishlistView({ initialData }: { initialData: WishlistData }) {
  const { setWishlistCount, setCartCount, showToast } = useAppState();
  const [data, setData] = useState(initialData);

  async function load() {
    const d = await apiFetch<WishlistData>("/api/wishlist-data");
    setData(d);
  }

  async function removeWish(id: number) {
    const res = await apiFetch<{ success: boolean; wishlist_count: number }>(`/api/remove-wishlist/${id}`, {
      method: "POST",
    });
    if (res.success) {
      setWishlistCount(res.wishlist_count);
      load();
    }
  }

  async function moveToBag(id: number) {
    const cartRes = await apiFetch<{ success: boolean; cart_count: number }>(`/api/add-to-cart/${id}`, {
      method: "POST",
      body: JSON.stringify({ quantity: 1 }),
    });
    if (cartRes.success) {
      setCartCount(cartRes.cart_count);
      await removeWish(id);
      showToast("Wishlist", "Item moved to your bag!");
    }
  }

  const isEmpty = data.wishlist.length === 0;

  return (
    <div className="wish-page-wrap reveal">
      <div className="wish-header-title">
        <h1>My Favorites</h1>
        <p>Curated list of your desired luxury pieces</p>
      </div>

      {isEmpty ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: "4rem", marginBottom: 20 }}>❤️</div>
          <h2>Your wishlist is empty</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>Start exploring and save items you love!</p>
          <a href="/shop" className="btn btn-primary" style={{ display: "inline-block" }}>
            Explore Collection
          </a>
        </div>
      ) : (
        <div className="wish-grid-box" style={{ display: "grid" }}>
          {data.wishlist.map((item) => (
            <div className="wish-luxe-card" key={item.id}>
              <div className="wish-img-area">
                <div className="del-wish-btn" onClick={() => removeWish(item.id)}>
                  <i className="fas fa-times"></i>
                </div>
                <a href={`/product/${item.slug || item.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.img || ""} alt={item.name} />
                </a>
              </div>
              <div className="wish-card-info">
                <span className="wish-card-cat">{item.category_name || "Luxury"}</span>
                <h3 className="wish-card-name">{item.name}</h3>
                <div className="wish-card-price">₹{item.price}</div>
              </div>
              <button className="move-to-bag-btn" onClick={() => moveToBag(item.id)}>
                <i className="fas fa-shopping-bag"></i> Move to Bag
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
