"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useAppState } from "./AppStateProvider";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact Us" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, cartCount, wishlistCount, setCartOpen, setSearchOpen, setUser } = useAppState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
  }, [menuOpen]);

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="site-header" id="header">
        <div className="main-bar">
          <Link href="/" className="logo">
            <Image src="/logo.png" alt="Luvtale" width={851} height={214} className="logo-img" priority />
          </Link>
          <nav className="nav-desktop">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={pathname === link.href ? "active" : ""}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="nav-actions">
            <div className="icon-btn" onClick={() => setSearchOpen(true)} title="Search">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <Link href="/wishlist" className="icon-btn" title="Wishlist">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="cart-badge">{wishlistCount}</span>
            </Link>
            <a
              href="javascript:void(0)"
              className="icon-btn"
              onClick={() => setCartOpen(true)}
              title="Cart"
              style={{ position: "relative" }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              <span className="cart-badge">{cartCount}</span>
            </a>
            <Link href={user ? "/profile" : "/login"} className="icon-btn" title="Account">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
            <div
              className={`hamburger${menuOpen ? " active" : ""}`}
              id="hamburger"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </header>

      <div className={`mobile-nav${menuOpen ? " open" : ""}`} id="mobile-nav">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
        <div
          className="mobile-nav-actions"
          style={{ marginTop: 20, display: "flex", flexDirection: "column", width: "100%" }}
        >
          {user ? (
            <a
              href="javascript:void(0)"
              onClick={handleLogout}
              className="btn btn-primary"
              style={{ display: "block", textAlign: "center", fontWeight: 700, width: "100%", padding: "12px 0", borderRadius: 12 }}
            >
              Logout
            </a>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="btn btn-primary"
              style={{ display: "block", textAlign: "center", fontWeight: 700, width: "100%", padding: "12px 0", borderRadius: 12 }}
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
