import Link from "next/link";
import { publicFetch } from "@/lib/public-fetch";
import type { Category, ProductCard as ProductCardType, Review } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import TrendingSection from "@/components/TrendingSection";
import FAQAccordion from "@/components/FAQAccordion";
import TestimonialsSlider from "@/components/TestimonialsSlider";
import NewsletterForm from "@/components/NewsletterForm";

interface HomeData {
  trending_products: ProductCardType[];
  bestseller_products: ProductCardType[];
  featured_products: ProductCardType[];
  reviews: Review[];
}

export default async function Home() {
  const [home, categories] = await Promise.all([
    publicFetch<HomeData>("/api/home"),
    publicFetch<Category[]>("/api/categories"),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="hero reveal">
        <div className="ambient-glow glow-1"></div>
        <div className="ambient-glow glow-2"></div>

        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-tag">
              <svg viewBox="0 0 12 12">
                <path d="M6 0l1.5 4.5H12L8.25 7.5l1.5 4.5L6 9.75 2.25 12l1.5-4.5L0 4.5h4.5L6 0z" />
              </svg>
              New Collection 2026
            </div>
            <h1>
              Where Tradition
              <br />
              <span className="hero-highlight">Meets Modern Grace</span>
              <span className="hero-subtext-lux">Handcrafted Luxury Couture</span>
            </h1>
            <p>Exquisite handlooms and bespoke bridal couture, handwoven by master artisans for your celebrations.</p>
            <div className="hero-btns">
              <Link href="/shop" className="btn btn-primary">
                Shop Now <i className="fas fa-arrow-right"></i>
              </Link>
              <Link href="/shop" className="btn btn-outline">
                Explore All →
              </Link>
            </div>
            <div className="hero-trust-row">
              <div className="hero-trust-badge">
                <i className="fas fa-shipping-fast"></i>
                <span>Free Shipping ₹500+</span>
              </div>
              <div className="hero-trust-badge">
                <i className="fas fa-undo"></i>
                <span>Easy Returns</span>
              </div>
              <div className="hero-trust-badge">
                <i className="fas fa-shield-alt"></i>
                <span>Secure Payment</span>
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-num">6.3k+</span>
                <span className="stat-label">Happy Customers</span>
              </div>
              <div className="stat">
                <span className="stat-num">500+</span>
                <span className="stat-label">Products</span>
              </div>
              <div className="stat">
                <span className="stat-num">50+</span>
                <span className="stat-label">Brands</span>
              </div>
            </div>
          </div>
          <div className="hero-image-wrap">
            <div className="hero-banner">
              <div className="hero-content t1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800"
                  alt="New Collection"
                  fetchPriority="high"
                />
                <div className="hero-title">New Arrivals</div>
                <div className="hero-subtitle">Explore 200+ styles</div>
              </div>
              <div className="hero-badge">Get 20% Off</div>
            </div>
            <div className="hero-pill hero-pill-bottom">
              <span className="hero-pill-emoji">🎨</span>
              <div>
                <strong>Handcrafted</strong>
                <span>By master artisans</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee-wrap">
        <div className="marquee-track">
          {Array.from({ length: 6 }).flatMap((_, i) =>
            categories.map((cat) => (
              <span key={`${i}-${cat.id}`}>
                <span className="marquee-item">{cat.name}</span>
                <span className="marquee-sep">✦</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* CATEGORIES */}
      <section id="categories" className="reveal">
        <div className="category-section">
          <div
            className="section-header-row"
            style={{ marginBottom: 30, textAlign: "center", display: "flex", justifyContent: "center", width: "100%" }}
          >
            <div style={{ textAlign: "center" }}>
              <h2 className="section-title" style={{ color: "#000", marginBottom: 6, fontFamily: "var(--font-family-display)", fontSize: "2.2rem", fontWeight: 800 }}>
                Shop by Category
              </h2>
              <p className="section-sub" style={{ color: "#1a1a1a", fontWeight: 600, fontSize: "0.95rem" }}>
                Exquisite traditional couture curated for every celebration
              </p>
            </div>
          </div>
          <div className="category-grid">
            {categories.map((cat) => (
              <div key={cat.id} className="category-item" style={{ background: cat.bg || "linear-gradient(135deg, #FFFDF9, #FFF5E6)" }}>
                <Link href={`/shop?category=${cat.id}`}>
                  <div className="category-image-wrapper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={cat.img || ""} className="category-img" alt={`${cat.name} Category`} loading="lazy" />
                    <div className="category-overlay"></div>
                  </div>
                  <div className="category-content">
                    <h3 className="category-name">{cat.name}</h3>
                    <span className="category-cta">Explore Couture</span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section
        className="products-section reveal"
        id="featured"
        style={{ background: "linear-gradient(180deg, #FFF0F2 0%, #FFFDF5 50%, #FFE5E9 100%)", padding: "100px 0", position: "relative", overflow: "hidden" }}
      >
        <div className="products-inner">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-sub">Handpicked premium selections for your wardrobe</p>
            </div>
            <Link href="/shop?collection=featured" className="btn btn-primary" style={{ flexShrink: 0, padding: "10px 25px", fontSize: "0.9rem" }}>
              View All
            </Link>
          </div>
          <div className="products-grid">
            {home.featured_products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* HERITAGE STORYTELLING */}
      <section className="heritage-section reveal">
        <div className="heritage-bg-motif motif-1"></div>
        <div className="heritage-bg-motif motif-2"></div>
        <div className="heritage-container">
          <div className="heritage-image-wrap">
            <div className="heritage-img-collage">
              <div className="heritage-img-main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1606744824163-985d376605aa?w=800" alt="Weaving and Artisan Craftsmanship" className="heritage-img" loading="lazy" />
                <div className="heritage-img-badge">
                  <span className="heritage-badge-year">Est.</span>
                  <span className="heritage-badge-num">2018</span>
                </div>
              </div>
              <div className="heritage-img-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400" alt="Traditional Indian Silk Saree" loading="lazy" />
              </div>
              <div className="heritage-img-accent">
                <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40 5L48 28H73L53 42L60 65L40 51L20 65L27 42L7 28H32L40 5Z" fill="var(--primary)" opacity="0.15" />
                  <path d="M40 12L46 30H65L50 40L56 58L40 48L24 58L30 40L15 30H34L40 12Z" stroke="var(--primary)" strokeWidth="1" fill="none" />
                </svg>
              </div>
            </div>
            <div className="heritage-trust-row">
              <div className="heritage-trust-item">
                <i className="fas fa-award"></i>
                <span>Master Artisans</span>
              </div>
              <div className="heritage-trust-item">
                <i className="fas fa-leaf"></i>
                <span>Ethical Sourcing</span>
              </div>
              <div className="heritage-trust-item">
                <i className="fas fa-hands"></i>
                <span>Handcrafted</span>
              </div>
            </div>
          </div>
          <div className="heritage-text">
            <div className="heritage-eyebrow">
              <span className="heritage-line"></span>
              <span className="heritage-subtitle">Our Story</span>
              <span className="heritage-line"></span>
            </div>
            <h2 className="heritage-title">
              The Artistry
              <br />
              of <em>Luvtale</em>
            </h2>
            <p className="heritage-description first">
              For generations, Indian handloom weaving and traditional couture have carried stories of craftsmanship, heritage, and timeless grace. At Luvtale, we collaborate directly with master artisans across Varanasi, Jaipur, and Kanchipuram to preserve these ancient techniques.
            </p>
            <p className="heritage-description">
              Every thread is spun with dedication, and every design is curated to bring out the royal elegance in your celebrations. Experience traditional couture redesigned for the modern muse.
            </p>
            <div className="heritage-stats-grid">
              <div className="heritage-stat">
                <span className="heritage-stat-num">200+</span>
                <span className="heritage-stat-label">Artisan Families</span>
              </div>
              <div className="heritage-stat">
                <span className="heritage-stat-num">8</span>
                <span className="heritage-stat-label">Craft Cities</span>
              </div>
              <div className="heritage-stat">
                <span className="heritage-stat-num">6.3k+</span>
                <span className="heritage-stat-label">Happy Customers</span>
              </div>
              <div className="heritage-stat">
                <span className="heritage-stat-num">100%</span>
                <span className="heritage-stat-label">Authentic Craft</span>
              </div>
            </div>
            <div className="heritage-locations">
              <span className="heritage-loc-label">Crafted from:</span>
              <div className="heritage-location-tags">
                <span className="heritage-loc-tag">
                  <i className="fas fa-map-pin"></i> Varanasi
                </span>
                <span className="heritage-loc-tag">
                  <i className="fas fa-map-pin"></i> Jaipur
                </span>
                <span className="heritage-loc-tag">
                  <i className="fas fa-map-pin"></i> Kanchipuram
                </span>
                <span className="heritage-loc-tag">
                  <i className="fas fa-map-pin"></i> Lucknow
                </span>
              </div>
            </div>
            <Link href="/about" className="btn btn-primary heritage-cta">
              Discover Our Story <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* TRENDING PRODUCTS */}
      <section
        className="products-section reveal"
        id="trending"
        style={{ background: "linear-gradient(180deg, #FFFDF5 0%, #FFECA9 50%, #FFFDF5 100%)", padding: "100px 0", position: "relative", overflow: "hidden" }}
      >
        <div className="products-inner">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Trending Now</h2>
              <p className="section-sub">Discover what&apos;s popular this season</p>
            </div>
            <Link href="/shop?collection=trending" className="btn btn-primary" style={{ flexShrink: 0, padding: "10px 25px", fontSize: "0.9rem" }}>
              View All
            </Link>
          </div>
          <TrendingSection products={home.trending_products} categories={categories} />
        </div>
      </section>

      {/* CURATED LOOKBOOKS */}
      <section className="lookbook-section reveal">
        <div className="lookbook-section-inner">
          <div className="lookbook-header">
            <div className="lookbook-header-text">
              <div className="lookbook-eyebrow">
                <span className="lookbook-eyebrow-line"></span>
                <span>Curated Lookbooks</span>
                <span className="lookbook-eyebrow-line"></span>
              </div>
              <h2 className="section-title">Style Narratives</h2>
              <p className="section-sub">Visual stories of elegance, tradition, and celebration for every season</p>
            </div>
            <Link href="/shop" className="btn btn-primary lookbook-view-all">
              Browse All Collections <i className="fas fa-arrow-right"></i>
            </Link>
          </div>
          <div className="lookbook-grid">
            <div className="lookbook-card lookbook-card-half">
              <div className="lookbook-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800" alt="Royal Velvet & Festive Lookbook" loading="lazy" />
                <div className="lookbook-overlay"></div>
              </div>
              <div className="lookbook-content">
                <div className="lookbook-meta">
                  <span className="lookbook-tag">✦ Festive Couture</span>
                  <span className="lookbook-edition">Vol. 01</span>
                </div>
                <h3>
                  Grand Palace
                  <br />
                  Wedding
                </h3>
                <p>Hand-embroidered Lehengas and Sherwanis crafted for the royal celebration you deserve.</p>
                <div className="lookbook-footer-row">
                  <Link href={`/shop?category=${categories[0]?.id ?? ""}`} className="lookbook-link">
                    Explore Collection <i className="fas fa-arrow-right"></i>
                  </Link>
                  <span className="lookbook-count">38 Pieces</span>
                </div>
              </div>
            </div>
            <div className="lookbook-card lookbook-card-half">
              <div className="lookbook-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=800" alt="Summer Pastels Lookbook" loading="lazy" />
                <div className="lookbook-overlay"></div>
              </div>
              <div className="lookbook-content">
                <div className="lookbook-meta">
                  <span className="lookbook-tag">✦ Pret-A-Porter</span>
                  <span className="lookbook-edition">Vol. 02</span>
                </div>
                <h3>
                  Summer Pastel
                  <br />
                  Romance
                </h3>
                <p>Lightweight organzas, georgettes, and breezy designer kurtis for warm, effortless days.</p>
                <div className="lookbook-footer-row">
                  <Link href={`/shop?category=${categories[0]?.id ?? ""}`} className="lookbook-link">
                    Explore Collection <i className="fas fa-arrow-right"></i>
                  </Link>
                  <span className="lookbook-count">55 Pieces</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section
        className="products-section reveal"
        id="bestsellers"
        style={{ background: "linear-gradient(180deg, #FFE5E9 0%, #FFFDF5 50%, #FFEBEF 100%)", padding: "100px 0", position: "relative", overflow: "hidden" }}
      >
        <div className="products-inner">
          <div className="section-header-row">
            <div>
              <h2 className="section-title">Best Sellers</h2>
              <p className="section-sub">Our most popular and highly rated garments</p>
            </div>
            <Link href="/shop?collection=bestseller" className="btn btn-primary" style={{ flexShrink: 0, padding: "10px 25px", fontSize: "0.9rem" }}>
              View All
            </Link>
          </div>
          <div className="products-grid">
            {home.bestseller_products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* NEW ARRIVALS SPOTLIGHT */}
      <section className="new-arrivals-section reveal">
        <div className="new-arrivals-container">
          <div className="new-arrivals-card">
            <div className="na-image-panel">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800" alt="New Arrivals Couture" loading="lazy" />
              <span className="na-collection-tag">Season 2026</span>
            </div>
            <div className="na-text-panel">
              <div className="na-eyebrow">
                <span className="na-eyebrow-dot"></span>
                Just Arrived
              </div>
              <h3 className="na-section-title">New Arrivals</h3>
              <h2>
                The Banarasi Luxe
                <br />
                Heritage Collection
              </h2>
              <p>
                Experience the finest weaves from the handlooms of Varanasi. Exquisite silk sarees, rich lehengas, and hand-embroidered kurtis reimagined with modern pastel shades for the modern Indian woman.
              </p>
              <div className="na-bullet-points">
                <div className="na-bullet">
                  <i className="fas fa-feather-alt"></i>
                  <div>
                    <strong>100% Pure Silks</strong>
                    <span>Premium georgette and organza bases</span>
                  </div>
                </div>
                <div className="na-bullet">
                  <i className="fas fa-magic"></i>
                  <div>
                    <strong>Master Weaver Craftsmanship</strong>
                    <span>Genuine metallic zari threads</span>
                  </div>
                </div>
              </div>
              <div className="na-action-row">
                <Link href="/shop?collection=new" className="btn btn-primary">
                  Shop Collection <i className="fas fa-arrow-right"></i>
                </Link>
                <Link href="/shop" className="btn btn-outline">
                  Explore All
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SHOP WITH US */}
      <section className="features-section reveal">
        <div className="container">
          <div className="centered-header-group">
            <div>
              <h2 className="section-title">Why Shop With Us?</h2>
              <p className="section-sub">Experience the best in fashion</p>
            </div>
          </div>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-shipping-fast"></i>
              </div>
              <h3>Fast Shipping</h3>
              <p>Free express delivery on all orders over ₹2000. Delivered to your doorstep in 3-5 days.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Secure Payment</h3>
              <p>Your security is our priority. We use 256-bit SSL encryption for all transactions.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-undo"></i>
              </div>
              <h3>Easy Returns</h3>
              <p>Not satisfied? No problem. Return any item within 30 days for a full refund.</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">
                <i className="fas fa-medal"></i>
              </div>
              <h3>Premium Quality</h3>
              <p>Hand-picked materials and ethical manufacturing for a touch of luxury in every stitch.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials-section section-padding-large reveal">
        <div className="container">
          <div className="centered-header-group">
            <div>
              <h2 className="section-title">What Our Customers Say</h2>
              <p className="section-sub">Real feedback from our boutique community</p>
            </div>
          </div>
          <TestimonialsSlider reviews={home.reviews} />
        </div>
      </section>

      {/* CONNECT WITH US */}
      <section className="social-connect-section reveal">
        <div className="container">
          <div className="centered-header-group">
            <div>
              <h2 className="section-title">Join Our Community</h2>
              <p className="section-sub">Stay inspired and connect with us on social media</p>
            </div>
          </div>
          <div className="social-grid">
            <a href="https://www.instagram.com/luvtaleofficial/#" target="_blank" rel="noopener" className="social-card instagram-card">
              <div className="social-icon-box">
                <i className="fab fa-instagram"></i>
              </div>
              <h3>Instagram</h3>
              <p>Daily fashion inspiration, behind-the-scenes stories & new arrival alerts.</p>
              <span className="social-link-btn">
                Follow Us <i className="fas fa-chevron-right"></i>
              </span>
            </a>
            <a href="https://pin.it/1VIvgJxyw" target="_blank" rel="noopener" className="social-card pinterest-card">
              <div className="social-icon-box">
                <i className="fab fa-pinterest"></i>
              </div>
              <h3>Pinterest</h3>
              <p>Curated style moodboards, bridal collection ideas, and luxury aesthetics.</p>
              <span className="social-link-btn">
                Pin With Us <i className="fas fa-chevron-right"></i>
              </span>
            </a>
            <a href="https://www.facebook.com/share/1GaEAcm2Gg/" target="_blank" rel="noopener" className="social-card facebook-card">
              <div className="social-icon-box">
                <i className="fab fa-facebook-f"></i>
              </div>
              <h3>Facebook</h3>
              <p>Join our styling group, share reviews, and participate in exclusive giveaways.</p>
              <span className="social-link-btn">
                Join Group <i className="fas fa-chevron-right"></i>
              </span>
            </a>
            <a href="https://wa.me/9140300085" target="_blank" rel="noopener" className="social-card whatsapp-card">
              <div className="social-icon-box">
                <i className="fab fa-whatsapp"></i>
              </div>
              <h3>Personal Stylist</h3>
              <p>Get direct styling advice, sizing help, and customized orders on WhatsApp.</p>
              <span className="social-link-btn">
                Chat Now <i className="fas fa-chevron-right"></i>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section reveal">
        <div className="container">
          <div className="centered-header-group">
            <div>
              <h2 className="section-title">Frequently Asked Questions</h2>
              <p className="section-sub">Everything you need to know about our boutique</p>
            </div>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="newsletter-section reveal">
        <div className="newsletter-inner">
          <h2>Join the Club</h2>
          <p>Subscribe to receive updates, access to exclusive deals, and more.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
