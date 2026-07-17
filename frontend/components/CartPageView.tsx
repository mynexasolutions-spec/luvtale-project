"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { CartData } from "@/lib/types";
import { useAppState } from "./AppStateProvider";

export default function CartPageView({ initialData }: { initialData: CartData }) {
  const { user, setCartCount, showToast } = useAppState();
  const router = useRouter();
  const [data, setData] = useState<CartData>(initialData);
  const [couponInput, setCouponInput] = useState("");
  const [couponMessage, setCouponMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"Razorpay" | "COD">("Razorpay");
  const [checkoutForm, setCheckoutForm] = useState({
    email: initialData.user_data?.email || "",
    phone: initialData.user_data?.phone || "",
    address: initialData.user_data?.address || "",
  });
  const [placing, setPlacing] = useState(false);

  async function load() {
    const d = await apiFetch<CartData>("/api/cart-data");
    setData(d);
    if (d.user_data) {
      setCheckoutForm({ email: d.user_data.email, phone: d.user_data.phone, address: d.user_data.address });
    }
  }

  const items = data ? Object.entries(data.cart) : [];

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

  async function applyCoupon(code: string) {
    if (!code.trim()) {
      setCouponMessage({ text: "Please enter a coupon code.", ok: false });
      return;
    }
    try {
      const result = await apiFetch<{ success: boolean; message: string }>("/api/apply-coupon", {
        method: "POST",
        body: JSON.stringify({ code: code.trim() }),
      });
      setCouponMessage({ text: result.message, ok: result.success });
      if (result.success) load();
    } catch (err) {
      setCouponMessage({ text: err instanceof Error ? err.message : "Error applying coupon code.", ok: false });
    }
  }

  async function removeCoupon() {
    const result = await apiFetch<{ success: boolean; message: string }>("/api/remove-coupon", { method: "POST" });
    if (result.success) {
      setCouponMessage(null);
      load();
    }
  }

  function proceedToCheckout() {
    if (!user) {
      alert("Please login to place an order.");
      router.push("/login");
      return;
    }
    setCheckoutOpen(true);
  }

  async function submitCheckout(e: React.FormEvent) {
    e.preventDefault();
    setPlacing(true);
    try {
      const result = await apiFetch<{ success: boolean; message?: string; order_number?: string }>("/api/place-order", {
        method: "POST",
        body: JSON.stringify({ ...checkoutForm, payment_method: paymentMethod }),
      });
      if (result.success) {
        showToast("Order placed!", `Order Number: ${result.order_number}`);
        router.push("/profile");
      } else {
        alert(result.message || "Failed to place order.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setPlacing(false);
    }
  }

  const shippingFree = data.shipping_charge === 0;

  return (
    <div className="cart-page-wrap reveal">
      <div className="cart-header-title">
        <h1>Your Shopping Bag</h1>
        <p>You have {data.count} items in your bag</p>
      </div>

      <div className="cart-layout">
        <div>
          <div className="cart-items-list">
            <div className="cart-table-header">
              <span>Product</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
              <span></span>
            </div>
            <div>
              {items.map(([id, item]) => (
                <div key={id} className="cart-item-row">
                  <div className="product-info-cell">
                    <a href={`/product/${item.slug || item.id}`} className="p-img-cart">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.img || ""} alt={item.name} />
                    </a>
                    <a href={`/product/${item.slug || item.id}`} className="p-details-cart" style={{ color: "inherit", textDecoration: "none" }}>
                      <h3>{item.name}</h3>
                    </a>
                  </div>
                  <span className="price-cell">₹{item.price}</span>
                  <div className="qty-cell">
                    <button className="qty-btn-mini" onClick={() => updateQty(id, -1)}>
                      -
                    </button>
                    <span className="qty-val-mini">{item.quantity}</span>
                    <button className="qty-btn-mini" onClick={() => updateQty(id, 1)}>
                      +
                    </button>
                  </div>
                  <span className="total-cell">₹{(item.price * item.quantity).toFixed(2)}</span>
                  <span className="remove-cell">
                    <i className="fas fa-trash-alt" onClick={() => removeItem(id)}></i>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: 60 }}>
              <div style={{ fontSize: "4rem", marginBottom: 20 }}>🛍️</div>
              <h2>Your bag is empty</h2>
              <a href="/shop" className="continue-shopping-link" style={{ marginTop: 20 }}>
                Browse our collection
              </a>
            </div>
          )}

          <a href="/shop" className="continue-shopping-link">
            <i className="fas fa-arrow-left"></i> Continue Shopping
          </a>
        </div>

        <aside className="cart-summary-card">
          <h2 className="summary-title">Order Summary</h2>
          <div className="summary-row">
            <span>Subtotal</span>
            <span>₹{data.subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span style={{ color: shippingFree ? "#4CAF50" : "inherit", fontWeight: 700 }}>
              {shippingFree ? "FREE" : `₹${data.shipping_charge.toFixed(2)}`}
            </span>
          </div>
          {data.coupon_code && (
            <div className="summary-row" style={{ color: "var(--primary)" }}>
              <span>Discount ({data.coupon_code})</span>
              <span>-₹{data.discount.toFixed(2)}</span>
            </div>
          )}

          <div className="summary-total-row">
            <span>Estimated Total</span>
            <span className="total-val">₹{data.total.toFixed(2)}</span>
          </div>

          <p style={{ fontSize: "0.8rem", color: "#999", marginTop: 15, textAlign: "center" }}>
            Tax included. Shipping calculated at checkout.
          </p>

          <button className="checkout-btn-full" onClick={proceedToCheckout}>
            Proceed to Checkout
          </button>

          <div className="coupon-box" style={{ marginTop: 25, borderTop: "1.5px dashed var(--border)", paddingTop: 20 }}>
            <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", color: "var(--secondary)", marginBottom: 8 }}>
              Promo / Coupon Code
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. LUVTALE10"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #eee", borderRadius: 8, fontFamily: "inherit", fontSize: "0.85rem", textTransform: "uppercase" }}
              />
              {data.coupon_code ? (
                <button className="btn btn-outline" onClick={removeCoupon} style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, height: "auto" }}>
                  Remove
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => applyCoupon(couponInput)} style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem", fontWeight: 700, height: "auto" }}>
                  Apply
                </button>
              )}
            </div>
            {couponMessage && (
              <p style={{ fontSize: "0.75rem", marginTop: 6, fontWeight: 600, color: couponMessage.ok ? "#4CAF50" : "#F44336" }}>
                {couponMessage.text}
              </p>
            )}
          </div>

          <div style={{ marginTop: 30, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#999", fontSize: "0.85rem" }}>
            <i className="fas fa-shield-alt" style={{ color: "#4CAF50" }}></i> Secure SSL Encryption & Data Protection
          </div>
        </aside>
      </div>

      {checkoutOpen && (
        <div
          className="checkout-modal-overlay"
          style={{ display: "flex", position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 9999, alignItems: "center", justifyContent: "center" }}
        >
          <div className="checkout-card" style={{ background: "#fff", borderRadius: 20, width: "90%", maxWidth: 520, padding: 30, boxShadow: "0 15px 40px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1.5px solid #eee", paddingBottom: 15 }}>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, fontFamily: "var(--font-family-display)" }}>Secure Checkout</h3>
              <button onClick={() => setCheckoutOpen(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#999" }}>
                &times;
              </button>
            </div>

            <form onSubmit={submitCheckout}>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>Email Address</label>
                <input
                  type="email"
                  required
                  value={checkoutForm.email}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, email: e.target.value }))}
                  style={{ width: "100%", padding: 12, border: "1.5px solid #eee", borderRadius: 10, fontFamily: "inherit", fontSize: "0.9rem" }}
                  placeholder="you@example.com"
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>Phone Number</label>
                <input
                  type="tel"
                  required
                  value={checkoutForm.phone}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, phone: e.target.value }))}
                  style={{ width: "100%", padding: 12, border: "1.5px solid #eee", borderRadius: 10, fontFamily: "inherit", fontSize: "0.9rem" }}
                  placeholder="e.g. +91 9876543210"
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontWeight: 700, fontSize: "0.85rem", marginBottom: 6 }}>Shipping Address</label>
                <textarea
                  required
                  rows={3}
                  value={checkoutForm.address}
                  onChange={(e) => setCheckoutForm((f) => ({ ...f, address: e.target.value }))}
                  style={{ width: "100%", padding: 12, border: "1.5px solid #eee", borderRadius: 10, fontFamily: "inherit", fontSize: "0.9rem", resize: "none" }}
                  placeholder="Street address, City, State, ZIP code"
                />
              </div>

              <div style={{ background: "#F8F9FB", borderRadius: 12, padding: 15, marginBottom: 20 }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: 12, fontFamily: "var(--font-family-display)" }}>Select Payment Method</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 15 }}>
                  <div className={`payment-method-btn${paymentMethod === "Razorpay" ? " active" : ""}`} onClick={() => setPaymentMethod("Razorpay")}>
                    <i className="fas fa-credit-card"></i>
                    Razorpay
                  </div>
                  <div className={`payment-method-btn${paymentMethod === "COD" ? " active" : ""}`} onClick={() => setPaymentMethod("COD")}>
                    <i className="fas fa-money-bill-wave"></i>
                    Cash on Delivery
                  </div>
                </div>

                {paymentMethod === "Razorpay" ? (
                  <div className="payment-details-box">
                    <p style={{ fontSize: "0.8rem", color: "#1565C0", margin: 0, textAlign: "center", fontWeight: 700, background: "#E3F2FD", padding: 12, borderRadius: 8, border: "1px solid #BBDEFB", lineHeight: 1.4 }}>
                      <i className="fas fa-shield-alt" style={{ marginRight: 6 }}></i> Pay securely using Cards, UPI, or NetBanking via Razorpay.
                    </p>
                  </div>
                ) : (
                  <div className="payment-details-box">
                    <p style={{ fontSize: "0.8rem", color: "#E65100", margin: 0, textAlign: "center", fontWeight: 700, background: "#FFF3E0", padding: 12, borderRadius: 8, border: "1px solid #FFE0B2", lineHeight: 1.4 }}>
                      <i className="fas fa-truck" style={{ marginRight: 6 }}></i> Pay ₹{data.total.toFixed(2)} in cash upon delivery of your items.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ background: "#FFFDF8", border: "1px solid var(--border)", borderRadius: 12, padding: 15, marginBottom: 20 }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: 12, fontFamily: "var(--font-family-display)" }}>Payment Summary</h4>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-muted)" }}>Subtotal:</span>
                  <span style={{ fontWeight: 600 }}>₹{data.subtotal.toFixed(2)}</span>
                </div>
                {data.coupon_code && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 8, color: "var(--primary)" }}>
                    <span>Discount ({data.coupon_code}):</span>
                    <span style={{ fontWeight: 700 }}>-₹{data.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #eee" }}>
                  <span style={{ color: "var(--text-muted)" }}>Shipping:</span>
                  <span style={{ fontWeight: 600 }}>{shippingFree ? "FREE" : `₹${data.shipping_charge.toFixed(2)}`}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "1.1rem" }}>
                  <span>Total Payable:</span>
                  <span style={{ color: "var(--primary)" }}>₹{data.total.toFixed(2)}</span>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={placing} style={{ width: "100%", padding: 15, borderRadius: 12, fontWeight: 700, fontSize: "1rem" }}>
                {placing ? "Placing Order..." : "Pay & Place Order"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
