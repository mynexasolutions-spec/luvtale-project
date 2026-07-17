import Link from "next/link";

export const metadata = { title: "About Us | Luvtale Boutique" };

export default function AboutPage() {
  return (
    <div className="about-page-wrap">
      <section className="about-hero reveal">
        <div className="about-hero-content">
          <span className="about-subtitle">Welcome to Luvtale</span>
          <h1 className="about-title">Crafting Modern Luxury &amp; Elegance</h1>
          <p className="about-lead">
            Born from a passion for premium fashion and a commitment to quality, Luvtale is a sanctuary for curated
            collections that inspire confidence and grace.
          </p>
        </div>
      </section>

      <section className="about-story-section section-padding-large reveal">
        <div className="container">
          <div className="about-story-grid">
            <div className="about-story-image-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800"
                alt="Luvtale Boutique Storefront"
                className="about-story-image"
                loading="lazy"
              />
            </div>
            <div className="about-story-text">
              <span className="about-section-tag">Since 2026</span>
              <h2>A Vision of Pure Distinction</h2>
              <p>
                At Luvtale, we believe style is a profound form of personal expression. Every garment we select
                represents a meticulous harmony of fine fabrics, exceptional craftsmanship, and contemporary design.
                We curate each seasonal collection to ensure you feel empowered, distinct, and effortlessly elegant.
              </p>
              <p>
                Our relationships with global artisans and sustainable manufacturing partners ensure that every
                thread carries a promise of high quality and ethical integrity.
              </p>
              <Link href="/shop" className="btn btn-primary">
                Explore Our Collection
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="about-values-section section-padding-large reveal">
        <div className="container">
          <div className="centered-header-group">
            <div>
              <h2 className="section-title">Our Core Values</h2>
              <p className="section-sub">The principles that guide our curation and service</p>
            </div>
          </div>
          <div className="about-values-grid">
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-crown"></i>
              </div>
              <h3>Curated Luxury</h3>
              <p>We hand-select every piece, prioritizing exquisite materials and immaculate design details over passing trends.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-leaf"></i>
              </div>
              <h3>Eco-Conscious</h3>
              <p>We are actively reducing our carbon footprint, sourcing materials ethically, and adopting sustainable packaging.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">
                <i className="fas fa-heart"></i>
              </div>
              <h3>Tailored Experience</h3>
              <p>Your journey is our priority. From smooth digital browsing to doorstep delivery, we strive to exceed expectations.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-promise-section section-padding-large reveal">
        <div className="container">
          <div className="about-promise-box">
            <span className="promise-tag">The Luvtale Promise</span>
            <h2>Elegance is in Every Detail</h2>
            <p>
              We stand behind our curation. If any garment does not meet your expectations or make you feel
              extraordinary, our seamless return service is here to assist you.
            </p>
            <div className="promise-icons-grid">
              <div className="promise-icon-item">
                <i className="fas fa-check-circle"></i>
                <span>100% Authentic Curation</span>
              </div>
              <div className="promise-icon-item">
                <i className="fas fa-shield-alt"></i>
                <span>Secure Payments</span>
              </div>
              <div className="promise-icon-item">
                <i className="fas fa-shipping-fast"></i>
                <span>Global Tracked Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
