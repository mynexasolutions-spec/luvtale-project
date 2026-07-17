import type { Metadata } from "next";
import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { AppStateProvider } from "@/components/AppStateProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartSidebar from "@/components/CartSidebar";
import SearchOverlay from "@/components/SearchOverlay";
import ScrollEffects from "@/components/ScrollEffects";
import { serverFetch } from "@/lib/server-fetch";
import { publicFetch } from "@/lib/public-fetch";
import type { Category, User } from "@/lib/types";

export const metadata: Metadata = {
  title: "Luvtale - Fashion Store",
  description: "Elevate your style with our curated collection of fashion-forward clothing and accessories.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sessionData, categories, cartData, wishlistData] = await Promise.all([
    serverFetch<{ user: User | null }>("/api/auth/session"),
    publicFetch<Category[]>("/api/categories"),
    serverFetch<{ count: number }>("/api/cart-data"),
    serverFetch<{ count: number }>("/api/wishlist-data"),
  ]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppStateProvider
          initialUser={sessionData.user}
          initialCartCount={cartData.count}
          initialWishlistCount={wishlistData.count}
        >
          <ScrollEffects />
          <Header />
          <main id="main-content">{children}</main>
          <Footer categories={categories} />
          <CartSidebar />
          <SearchOverlay />
          <div className="floating-contact-wrap">
            <a href="https://wa.me/919140300085" target="_blank" rel="noopener" className="floating-btn floating-whatsapp" title="Chat on WhatsApp">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.905-6.99C16.457 1.874 13.976 1.83 12.01 1.83c-5.437 0-9.864 4.42-9.868 9.865-.001 1.764.462 3.486 1.343 5.011l-.988 3.606 3.7-.968zM17.15 15.3c-.28-.14-1.65-.81-1.91-.91-.26-.09-.45-.14-.64.14-.19.28-.73.91-.89 1.1-.16.18-.32.2-.6.06-2.72-1.36-4.43-3.23-5.11-4.4-.18-.3-.02-.46.12-.6.13-.13.3-.35.45-.53.15-.17.2-.28.3-.47.1-.19.05-.36-.02-.5-.08-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49-.17-.01-.36-.01-.56-.01-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.47 0 1.46 1.06 2.87 1.21 3.07.15.2 2.09 3.19 5.07 4.48.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.12-.26-.19-.54-.33z"/></svg>
            </a>
            <a href="tel:+919696231554" className="floating-btn floating-call" title="Call Us">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
            </a>
          </div>
        </AppStateProvider>
      </body>
    </html>
  );
}
