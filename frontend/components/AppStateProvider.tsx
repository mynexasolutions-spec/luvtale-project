"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { User } from "@/lib/types";

interface Toast {
  id: number;
  title: string;
  message: string;
}

interface AppState {
  user: User | null;
  setUser: (u: User | null) => void;
  cartCount: number;
  wishlistCount: number;
  setCartCount: (n: number) => void;
  setWishlistCount: (n: number) => void;
  refreshCounts: () => Promise<void>;
  addToCart: (productId: number, variationId?: number | null) => Promise<void>;
  addToWishlist: (productId: number) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  showToast: (title: string, message: string) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({
  children,
  initialUser,
  initialCartCount,
  initialWishlistCount,
}: {
  children: React.ReactNode;
  initialUser: User | null;
  initialCartCount: number;
  initialWishlistCount: number;
}) {
  const [user, setUser] = useState(initialUser);
  const [cartCount, setCartCount] = useState(initialCartCount);
  const [wishlistCount, setWishlistCount] = useState(initialWishlistCount);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const showToast = useCallback((title: string, message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, title, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const refreshCounts = useCallback(async () => {
    const [cart, wishlist] = await Promise.all([
      apiFetch<{ count: number }>("/api/cart-data"),
      apiFetch<{ count: number }>("/api/wishlist-data"),
    ]);
    setCartCount(cart.count);
    setWishlistCount(wishlist.count);
  }, []);

  const addToCart = useCallback(
    async (productId: number, variationId: number | null = null) => {
      const url = variationId
        ? `/api/add-to-cart/${productId}?v=${variationId}`
        : `/api/add-to-cart/${productId}`;
      const data = await apiFetch<{ success: boolean; cart_count: number }>(url, {
        method: "POST",
        body: JSON.stringify({ quantity: 1 }),
      });
      if (data.success) {
        setCartCount(data.cart_count);
        showToast("Success", "Item added to your bag");
      }
    },
    [showToast]
  );

  const addToWishlist = useCallback(
    async (productId: number) => {
      const data = await apiFetch<{ success: boolean; wishlist_count: number }>(
        `/api/add-to-wishlist/${productId}`,
        { method: "POST" }
      );
      if (data.success) {
        setWishlistCount(data.wishlist_count);
        showToast("Wishlist", "Saved to your favorites");
      }
    },
    [showToast]
  );

  const removeFromWishlist = useCallback(async (productId: number) => {
    const data = await apiFetch<{ success: boolean; wishlist_count: number }>(
      `/api/remove-wishlist/${productId}`,
      { method: "POST" }
    );
    if (data.success) {
      setWishlistCount(data.wishlist_count);
    }
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        user,
        setUser,
        cartCount,
        wishlistCount,
        setCartCount,
        setWishlistCount,
        refreshCounts,
        addToCart,
        addToWishlist,
        removeFromWishlist,
        showToast,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
      }}
    >
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <strong>{t.title}</strong>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
