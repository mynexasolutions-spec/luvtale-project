import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/types";

export default function Footer({ categories }: { categories: Category[] }) {
  return (
    <footer>
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="logo">
              <Image src="/logo.png" alt="Luvtale" width={851} height={214} className="logo-img" />
            </span>
            <p>Elevate your style with our curated collection of fashion-forward clothing and accessories.</p>
            <div className="footer-social">
              <a href="https://www.facebook.com/share/1GaEAcm2Gg/" target="_blank" rel="noopener" className="social-btn" aria-label="Facebook" style={{ color: "inherit", textDecoration: "none" }}>
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://www.instagram.com/luvtaleofficial/#" target="_blank" rel="noopener" className="social-btn" aria-label="Instagram" style={{ color: "inherit", textDecoration: "none" }}>
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://youtube.com/@luvtaleofficial?si=Uo0jB14a2zaA0jrW" target="_blank" rel="noopener" className="social-btn" aria-label="Youtube" style={{ color: "inherit", textDecoration: "none" }}>
                <i className="fab fa-youtube"></i>
              </a>
              <a href="https://pin.it/1VIvgJxyw" target="_blank" rel="noopener" className="social-btn" aria-label="Pinterest" style={{ color: "inherit", textDecoration: "none" }}>
                <i className="fab fa-pinterest"></i>
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h5>Shop</h5>
            <ul>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <Link href={`/shop?category=${cat.id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h5>Policies</h5>
            <ul>
              <li><Link href="/privacy-policy">Privacy Policy</Link></li>
              <li><Link href="/terms-conditions">Terms & Conditions</Link></li>
              <li><Link href="/shipping-policy">Shipping Policy</Link></li>
              <li><Link href="/refund-policy">Cancellation & Refund</Link></li>
            </ul>
          </div>
          <div className="footer-col" style={{ minWidth: 250 }}>
            <h5>Contact Us</h5>
            <ul className="footer-contact">
              <li><i className="fas fa-envelope"></i> <span>luvtaleofficial@gmail.com</span></li>
              <li><i className="fab fa-whatsapp"></i> <span>WhatsApp: +91 9140300085</span></li>
              <li><i className="fab fa-whatsapp"></i> <span>WhatsApp: +91 8766280955</span></li>
              <li><i className="fas fa-phone-alt"></i> <span>Call: +91 9696231554</span></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Luvtale Boutique. All rights reserved.</p>
          <div className="footer-payment">
            <span className="payment-badge">VISA</span>
            <span className="payment-badge">MC</span>
            <span className="payment-badge">AMEX</span>
            <span className="payment-badge">PayPal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
