"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CartData } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

export default function CartSidebar() {
  const { cartOpen, setCartOpen, setCartCount } = useAppState();
  const router = useRouter();
  const [data, setData] = useState<CartData | null>(null);

  async function load() {
    const d = await apiFetch<CartData>("/api/cart-data");
    setData(d);
  }

  useEffect(() => {
    if (!cartOpen) return;
    let cancelled = false;
    apiFetch<CartData>("/api/cart-data").then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [cartOpen]);

  async function updateQty(id: string, delta: number) {
    const res = await apiFetch<{ success: boolean; cart_count: number }>(`/api/update-cart/${id}`, {
      method: "POST",
      body: JSON.stringify({ delta }),
    });
    if (res.success) {
      setCartCount(res.cart_count);
      load();
    }
  }

  async function removeItem(id: string) {
    if (!confirm("Remove this item from your bag?")) return;
    const res = await apiFetch<{ success: boolean; cart_count: number }>(`/api/remove-from-cart/${id}`, {
      method: "POST",
    });
    if (res.success) {
      setCartCount(res.cart_count);
      load();
    }
  }

  if (!cartOpen) return null;
  const items = data ? Object.entries(data.cart) : [];
  const belowThreshold = data ? data.subtotal > 0 && data.subtotal < data.shipping_threshold : false;

  return (
    <>
      <div className="cart-overlay active" onClick={() => setCartOpen(false)}></div>
      <div className="cart-sidebar active">
        <div className="cart-header">
          <h4>
            Shopping Cart{" "}
            <span style={{ fontSize: 14, color: "var(--body)", fontWeight: 400 }}>
              ({data?.count ?? 0} items)
            </span>
          </h4>
          <div className="close-btn" onClick={() => setCartOpen(false)}>
            ✕
          </div>
        </div>
        <div className="cart-items">
          {items.map(([id, item]) => (
            <div
              key={id}
              className="cart-item"
              style={{
                display: "flex",
                gap: 15,
                marginBottom: 20,
                alignItems: "center",
                position: "relative",
                background: "#fff",
                padding: 10,
                borderRadius: 15,
                boxShadow: "0 5px 15px rgba(0,0,0,0.02)",
              }}
            >
              <a
                href={`/product/${item.slug || item.id}`}
                style={{ width: 70, height: 70, background: "#f8f8f8", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <img src={item.img || ""} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} alt={item.name} />
              </a>
              <div style={{ flex: 1 }}>
                <a href={`/product/${item.slug || item.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <h5 style={{ fontSize: 14, marginBottom: 4, fontWeight: 600 }}>{item.name}</h5>
                </a>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", border: "1px solid #eee", borderRadius: 6, overflow: "hidden" }}>
                    <button onClick={() => updateQty(id, -1)} style={{ border: "none", background: "none", padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}>
                      -
                    </button>
                    <span style={{ padding: "0 8px", fontSize: 12, fontWeight: 700 }}>{item.quantity}</span>
                    <button onClick={() => updateQty(id, 1)} style={{ border: "none", background: "none", padding: "2px 8px", cursor: "pointer", fontWeight: 700 }}>
                      +
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700 }}>₹{item.price}</div>
                </div>
              </div>
              <button
                onClick={() => removeItem(id)}
                style={{ position: "absolute", top: -5, right: -5, width: 22, height: 22, background: "#ff4d4d", color: "#fff", border: "none", borderRadius: "50%", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}
              >
                ✕
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--body)", fontSize: 13, marginTop: 40 }}>Your bag is empty.</p>
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-total">
            <span>Subtotal</span>
            <span>₹{(data?.subtotal ?? 0).toFixed(2)}</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--body)", textAlign: "center", marginBottom: 12 }}>
            {belowThreshold
              ? `Add ₹${((data?.shipping_threshold ?? 0) - (data?.subtotal ?? 0)).toFixed(2)} more for free shipping`
              : "🎉 You qualify for free shipping!"}
          </p>
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", display: "flex", marginBottom: 8 }}
            onClick={() => {
              setCartOpen(false);
              router.push("/cart");
            }}
          >
            Checkout →
          </button>
          <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setCartOpen(false)}>
            Continue Shopping
          </button>
        </div>
      </div>
    </>
  );
}
