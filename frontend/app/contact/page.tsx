import ContactForm from "@/components/ContactForm";

export const metadata = { title: "Contact Us | Luvtale Boutique" };

export default function ContactPage() {
  return (
    <section className="contact-section-wrap reveal">
      <div className="contact-container">
        <div className="contact-header">
          <span className="tag">Get in Touch</span>
          <h1>We&apos;re Here to Help</h1>
          <p>Whether you have a question about our collections or need personal styling advice, our team is ready to assist you.</p>
        </div>

        <div className="contact-card">
          <div className="contact-info-panel">
            <div>
              <h3>Contact Information</h3>
              <div className="contact-details-list">
                <div className="contact-detail-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <div>
                    <h4>Visit Us</h4>
                    <p>
                      123 Boutique Street, Fashion District
                      <br />
                      New York, NY 10001
                    </p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <i className="fas fa-envelope"></i>
                  <div>
                    <h4>Email Us</h4>
                    <p>
                      <a href="mailto:luvtaleofficial@gmail.com">luvtaleofficial@gmail.com</a>
                    </p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <i className="fab fa-whatsapp"></i>
                  <div>
                    <h4>WhatsApp Us</h4>
                    <p>
                      <a href="https://wa.me/919140300085" target="_blank" rel="noopener">
                        +91 9140300085
                      </a>
                      <br />
                      <a href="https://wa.me/918766280955" target="_blank" rel="noopener">
                        +91 8766280955
                      </a>
                    </p>
                  </div>
                </div>
                <div className="contact-detail-item">
                  <i className="fas fa-phone-alt"></i>
                  <div>
                    <h4>Call Us</h4>
                    <p>
                      <a href="tel:+919696231554">+91 9696231554</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="contact-socials">
              <a href="https://www.instagram.com/luvtaleofficial/#" target="_blank" rel="noopener" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="https://www.facebook.com/share/1GaEAcm2Gg/" target="_blank" rel="noopener" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="https://pin.it/1VIvgJxyw" target="_blank" rel="noopener" aria-label="Pinterest">
                <i className="fab fa-pinterest"></i>
              </a>
              <a href="https://youtube.com/@luvtaleofficial?si=Uo0jB14a2zaA0jrW" target="_blank" rel="noopener" aria-label="Youtube">
                <i className="fab fa-youtube"></i>
              </a>
            </div>
          </div>

          <div className="contact-form-panel">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
