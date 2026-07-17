import Link from "next/link";

const LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-conditions", label: "Terms & Conditions" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/refund-policy", label: "Cancellation & Refund" },
];

export default function PolicyLayout({
  active,
  title,
  lead,
  children,
}: {
  active: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="policy-layout reveal">
      <aside className="policy-sidebar-nav">
        <h3>Quick Links</h3>
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={active === link.href ? "active" : ""}>
            {link.label}
          </Link>
        ))}
      </aside>

      <div className="policy-content-card">
        <h1 className="policy-title">{title}</h1>
        <div className="policy-text">
          <p className="policy-lead">{lead}</p>
          {children}
          <h3 style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 25 }}>Contact Us</h3>
          <p>
            If you have any questions or require further assistance regarding our policies, please contact us at{" "}
            <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
              luvtaleofficial@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
