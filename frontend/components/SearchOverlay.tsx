"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "./AppStateProvider";
import type { WishlistItem } from "@/lib/types";

type SearchResult = Pick<WishlistItem, "id" | "name" | "slug" | "price" | "img">;

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useAppState();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastSearchOpen, setLastSearchOpen] = useState(searchOpen);

  if (searchOpen !== lastSearchOpen) {
    setLastSearchOpen(searchOpen);
    if (!searchOpen) {
      setValue("");
      setResults(null);
    }
  }

  useEffect(() => {
    if (searchOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  function handleChange(val: string) {
    setValue(val);
    if (timer.current) clearTimeout(timer.current);
    if (!val.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
    }, 300);
  }

  return (
    <div className={`search-overlay${searchOpen ? " open" : ""}`}>
      <div className="search-inner">
        <div className="search-input-wrap">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for products..."
            value={value}
            onChange={(e) => handleChange(e.target.value)}
          />
          <span className="search-close" onClick={() => setSearchOpen(false)}>
            ✕
          </span>
        </div>
        <div className="search-results-container">
          {loading && <p style={{ color: "#aaa", fontSize: "0.9rem" }}>Searching...</p>}
          {!loading && results && results.length === 0 && (
            <p style={{ color: "#aaa", fontSize: "0.9rem" }}>No products found.</p>
          )}
          {!loading &&
            results?.map((p) => (
              <a
                key={p.id}
                href={`/product/${p.slug}`}
                onClick={() => setSearchOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
              >
                <img
                  src={p.img || ""}
                  alt={p.name}
                  style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, background: "#f5f5f5", flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--secondary)", marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>₹{p.price}</div>
                </div>
              </a>
            ))}
        </div>
      </div>
    </div>
  );
}
