"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import type { Category, Order, ProfileData, UserProduct, WishlistItem } from "@/lib/types";
import { useAppState } from "./AppStateProvider";
import ProductFormModal from "./ProductFormModal";
import ReturnExchangeModal from "./ReturnExchangeModal";

type Tab = "settings" | "orders" | "wishlist" | "products";

export default function ProfileView({ initialData, categories }: { initialData: ProfileData; categories: Category[] }) {
  const { addToCart, removeFromWishlist, showToast } = useAppState();
  const [tab, setTab] = useState<Tab>("settings");
  const [user, setUser] = useState(initialData.user);
  const [orders, setOrders] = useState<Order[]>(initialData.orders);
  const [settingsForm, setSettingsForm] = useState({ email: user.email, phone: user.phone, address: user.address });
  const [saving, setSaving] = useState(false);

  const [wishlist, setWishlist] = useState<WishlistItem[] | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[] | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UserProduct | null>(null);
  const [returnExchangeOrder, setReturnExchangeOrder] = useState<Order | null>(null);

  async function selectTab(next: Tab) {
    setTab(next);
    if (next === "wishlist" && wishlist === null) {
      const data = await apiFetch<{ wishlist: WishlistItem[] }>("/api/wishlist-data");
      setWishlist(data.wishlist);
    }
    if (next === "products" && userProducts === null) {
      const data = await apiFetch<{ products: UserProduct[] }>("/api/user/products");
      setUserProducts(data.products);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await apiFetch<ProfileData>("/api/auth/profile", {
        method: "POST",
        body: JSON.stringify(settingsForm),
      });
      setUser(result.user);
      showToast("Saved", "Profile updated successfully!");
    } finally {
      setSaving(false);
    }
  }

  async function removeWishlistItem(id: number) {
    await removeFromWishlist(id);
    setWishlist((w) => w?.filter((i) => i.id !== id) ?? null);
  }

  async function refreshUserProducts() {
    const data = await apiFetch<{ products: UserProduct[] }>("/api/user/products");
    setUserProducts(data.products);
    setProductModalOpen(false);
    setEditingProduct(null);
  }

  async function deleteUserProduct(id: number) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    const result = await apiFetch<{ success: boolean; message?: string }>(`/api/user/products/delete/${id}`, {
      method: "POST",
    });
    if (result.success) {
      setUserProducts((list) => list?.filter((p) => p.id !== id) ?? null);
    } else {
      alert(result.message || "Failed to delete product.");
    }
  }

  async function refreshOrders() {
    const data = await apiFetch<ProfileData>("/api/auth/profile");
    setOrders(data.orders);
    setReturnExchangeOrder(null);
  }

  return (
    <div className="profile-page reveal">
      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="avatar-box">{user.username[0]?.toUpperCase()}</div>
          <div style={{ textAlign: "center" }}>
            <h3 style={{ fontFamily: "var(--font-family-display)", fontSize: "1.5rem", marginBottom: 5 }}>{user.username}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Member since {user.id + 2023}</p>
          </div>

          <div className="profile-nav">
            <div className={`nav-item${tab === "settings" ? " active" : ""}`} onClick={() => selectTab("settings")}>
              <i className="fas fa-user-cog"></i> Account Settings
            </div>
            <div className={`nav-item${tab === "orders" ? " active" : ""}`} onClick={() => selectTab("orders")}>
              <i className="fas fa-shopping-bag"></i> My Orders
            </div>
            <div className={`nav-item${tab === "wishlist" ? " active" : ""}`} onClick={() => selectTab("wishlist")}>
              <i className="fas fa-heart"></i> Wishlist
            </div>
            <div className={`nav-item${tab === "products" ? " active" : ""}`} onClick={() => selectTab("products")}>
              <i className="fas fa-box"></i> Manage Products
            </div>
            <a href="javascript:void(0)" onClick={() => apiFetch("/api/auth/logout", { method: "POST" }).then(() => (window.location.href = "/"))} className="nav-item" style={{ marginTop: 20, color: "var(--primary)" }}>
              <i className="fas fa-sign-out-alt" style={{ color: "var(--primary)" }}></i> Logout
            </a>
          </div>
        </div>

        <div className="profile-content">
          {tab === "settings" && (
            <div className="profile-content-box tab-content">
              <h2 className="profile-section-title">Account Settings</h2>
              <form className="profile-form" onSubmit={saveSettings}>
                <div className="profile-form-grid">
                  <div style={{ gridColumn: "span 2" }}>
                    <label>Full Name</label>
                    <input type="text" value={user.username} readOnly style={{ background: "var(--light)", color: "var(--text-muted)", borderColor: "var(--border)" }} />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input type="email" value={settingsForm.email} onChange={(e) => setSettingsForm((f) => ({ ...f, email: e.target.value }))} placeholder="Enter your email" />
                  </div>
                  <div>
                    <label>Phone Number</label>
                    <input type="text" value={settingsForm.phone} onChange={(e) => setSettingsForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <label>Shipping Address</label>
                    <textarea rows={4} value={settingsForm.address} onChange={(e) => setSettingsForm((f) => ({ ...f, address: e.target.value }))} placeholder="Enter your full delivery address" />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="checkout-btn-full" style={{ marginTop: 40, maxWidth: 250 }}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {tab === "orders" && (
            <div className="profile-content-box tab-content">
              <h2 className="profile-section-title">My Orders</h2>
              {orders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 0" }}>
                  <i className="fas fa-box-open" style={{ fontSize: "4rem", color: "#eee", marginBottom: 20 }}></i>
                  <h3 style={{ color: "var(--text-muted)" }}>No orders yet.</h3>
                  <Link href="/" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none", marginTop: 10, display: "block" }}>
                    Start Shopping →
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="order-card"
                    style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 15, background: "#fff", padding: 20, borderRadius: 16, border: "1.5px solid #eee", marginBottom: 15 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <div>
                        <h4 style={{ fontWeight: 800, marginBottom: 5 }}>Order #{order.order_number}</h4>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          Placed on {new Date(order.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 800, fontSize: "1.2rem", display: "block", marginBottom: 5 }}>₹{order.total_amount}</span>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{Math.floor(order.total_amount / 500)} Items</p>
                      </div>
                      <span className={`status-badge ${["Pending", "Return Requested", "Exchange Requested"].includes(order.status) ? "status-pending" : "status-completed"}`}>
                        {order.status}
                      </span>
                    </div>

                    {order.return_exchange_type ? (
                      <div style={{ padding: "12px 15px", background: "#FFF9F3", border: "1.5px solid #F5DCA0", borderRadius: 12, fontSize: "0.85rem", width: "100%" }}>
                        <span style={{ fontWeight: 700, color: "#E65100" }}>
                          <i className="fas fa-undo-alt"></i> {order.return_exchange_type} Status:{" "}
                        </span>
                        <span
                          style={{
                            fontWeight: 800,
                            textTransform: "uppercase",
                            color: order.return_exchange_status === "Approved" ? "#2E7D32" : order.return_exchange_status === "Rejected" ? "#C62828" : "#E65100",
                          }}
                        >
                          {order.return_exchange_status || "Pending"}
                        </span>
                        <p style={{ margin: "5px 0 0", color: "#555" }}>
                          <strong>Reason:</strong> {order.return_exchange_reason}
                        </p>
                      </div>
                    ) : (
                      <div style={{ textAlign: "right", width: "100%", borderTop: "1px dashed #eee", paddingTop: 10 }}>
                        <button
                          className="btn btn-outline"
                          style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: 8, borderColor: "var(--primary)", color: "var(--primary)", background: "transparent", fontWeight: 700, cursor: "pointer" }}
                          onClick={() => setReturnExchangeOrder(order)}
                        >
                          <i className="fas fa-retweet"></i> Return / Exchange
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "wishlist" && (
            <div className="profile-content-box tab-content">
              <h2 className="profile-section-title">My Wishlist</h2>
              <p style={{ color: "var(--text-muted)", marginBottom: 30 }}>Your favorite items are saved here.</p>
              {wishlist && wishlist.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 0" }}>
                  <i className="fas fa-heart" style={{ fontSize: "4rem", color: "#eee", marginBottom: 20 }}></i>
                  <h3 style={{ color: "var(--text-muted)" }}>Wishlist is empty.</h3>
                  <a href="/shop" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none", marginTop: 10, display: "block" }}>
                    Browse Shop →
                  </a>
                </div>
              ) : (
                <div className="products-grid-3">
                  {wishlist?.map((item) => (
                    <div className="product-card" key={item.id}>
                      <div className="trending-product-img-wrap" style={{ background: "var(--sand)", minHeight: 200, padding: 15 }}>
                        <div className="trending-img-container">
                          <a href={`/product/${item.slug || item.id}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.img || ""} alt={item.name} className="product-image primary trending-img" style={{ maxHeight: 120 }} loading="lazy" />
                          </a>
                        </div>
                        <div className="product-card-actions">
                          <a href={`/product/${item.slug || item.id}`} className="quick-view-btn" style={{ padding: "8px 16px", fontSize: "0.8rem" }}>
                            Quick View
                          </a>
                          <div className="action-icons">
                            <button className="circle-btn" style={{ width: 38, height: 38 }} onClick={() => removeWishlistItem(item.id)}>
                              <i className="fas fa-trash-alt" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                            <button className="circle-btn" style={{ width: 38, height: 38 }} onClick={() => addToCart(item.id)}>
                              <i className="fas fa-shopping-cart" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="product-info" style={{ textAlign: "left", padding: "15px 0 0" }}>
                        <a href={`/product/${item.slug || item.id}`} className="product-name" style={{ fontSize: "0.9rem" }}>
                          {item.name}
                        </a>
                        <div className="price-rating-wrap">
                          <div className="product-price">
                            <span className="curr-price" style={{ fontSize: "0.95rem" }}>
                              ₹{item.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "products" && (
            <div className="profile-content-box tab-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25, gap: 10 }}>
                <h2 className="profile-section-title" style={{ margin: 0 }}>
                  Manage Products
                </h2>
                <button
                  className="checkout-btn-full"
                  style={{ maxWidth: 180, padding: "10px 15px", margin: 0, flexShrink: 0 }}
                  onClick={() => {
                    setEditingProduct(null);
                    setProductModalOpen(true);
                  }}
                >
                  <i className="fas fa-plus"></i> Add Product
                </button>
              </div>
              <p style={{ color: "var(--text-muted)", marginBottom: 25 }}>Upload, edit, or delete items you are selling.</p>

              {userProducts && userProducts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 0" }}>
                  <i className="fas fa-boxes" style={{ fontSize: "4rem", color: "#eee", marginBottom: 20 }}></i>
                  <h3 style={{ color: "var(--text-muted)", marginBottom: 15 }}>No products uploaded yet.</h3>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "10px 20px" }}
                    onClick={() => {
                      setEditingProduct(null);
                      setProductModalOpen(true);
                    }}
                  >
                    Add Your First Product
                  </button>
                </div>
              ) : (
                <div className="products-grid-3">
                  {userProducts?.map((p) => (
                    <div className="product-card" key={p.id}>
                      <div className="trending-product-img-wrap" style={{ background: "var(--sand)", minHeight: 200, padding: 15 }}>
                        {p.badge && <span className="trending-badge">{p.badge}</span>}
                        <div className="trending-img-container">
                          <a href={`/product/${p.slug || p.id}`}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.img_primary || ""} alt={p.name} className="product-image primary trending-img" style={{ maxHeight: 120 }} loading="lazy" />
                          </a>
                        </div>
                        <div className="product-card-actions">
                          <button
                            className="quick-view-btn"
                            style={{ padding: "8px 16px", fontSize: "0.8rem", border: "none", cursor: "pointer" }}
                            onClick={() => {
                              setEditingProduct(p);
                              setProductModalOpen(true);
                            }}
                          >
                            Edit Product
                          </button>
                          <div className="action-icons">
                            <button className="circle-btn" style={{ width: 38, height: 38 }} onClick={() => deleteUserProduct(p.id)}>
                              <i className="fas fa-trash-alt" style={{ fontSize: "0.8rem" }}></i>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="product-info" style={{ textAlign: "left", padding: "15px 0 0" }}>
                        <a href={`/product/${p.slug || p.id}`} className="product-name" style={{ fontSize: "0.9rem" }}>
                          {p.name}
                        </a>
                        <div className="price-rating-wrap" style={{ marginTop: 5 }}>
                          <div className="product-price">
                            <span className="curr-price" style={{ fontSize: "0.95rem" }}>
                              ₹{p.price}
                            </span>
                            {p.old_price && (
                              <span className="old-price" style={{ fontSize: "0.8rem" }}>
                                ₹{p.old_price}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: "0.75rem", color: "#888", background: "#eee", padding: "2px 6px", borderRadius: 4 }}>Stock: {p.stock_count}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 5 }}>Category: {p.category_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {productModalOpen && (
        <ProductFormModal
          categories={categories}
          editingProduct={editingProduct}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSaved={refreshUserProducts}
        />
      )}

      {returnExchangeOrder && (
        <ReturnExchangeModal
          orderId={returnExchangeOrder.id}
          orderNumber={returnExchangeOrder.order_number}
          onClose={() => setReturnExchangeOrder(null)}
          onSubmitted={refreshOrders}
        />
      )}
    </div>
  );
}
