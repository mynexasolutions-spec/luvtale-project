import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Terms & Conditions | Luvtale" };

export default function TermsConditionsPage() {
  return (
    <PolicyLayout
      active="/terms-conditions"
      title="Terms & Conditions"
      lead="Please read these terms carefully before accessing or using our online store."
    >
      <h3>1. Agreement to Terms</h3>
      <p>
        By visiting our site and/ or purchasing something from us, you engage in our “Service” and agree to be bound by the following terms and conditions (“Terms & Conditions”, “Terms”), including those additional terms and conditions and policies referenced herein. These Terms apply to all users of the site.
      </p>

      <h3>2. Handcrafted & Bespoke Products</h3>
      <p>
        All garments and couture pieces listed on Luvtale are handcrafted and made-to-measure. Minor variations in weave, embroidery, shade, or texture are inherent characteristics of handloom and handcrafted luxury garments and enhance their authentic beauty.
      </p>

      <h3>3. Product Accuracy & Pricing</h3>
      <p>
        We make every effort to display as accurately as possible the colors and images of our products. However, we cannot guarantee that your computer monitor&apos;s display of any color will be completely accurate. Prices for our products are subject to change without notice. We reserve the right to modify or discontinue any product or service at any time.
      </p>

      <h3>4. Orders & Billing</h3>
      <p>
        We reserve the right to refuse any order you place with us. We may, in our sole discretion, limit or cancel quantities purchased per person, per household or per order. In the event that we make a change to or cancel an order, we will notify you by contacting the email and/or billing address/phone number provided at the time the order was made.
      </p>

      <h3>5. Intellectual Property</h3>
      <p>
        All content, designs, imagery, logos, graphics, and text contained on this website are the exclusive property of Luvtale and are protected by international copyright, trademark, and intellectual property laws. Unauthorized reproduction or commercial distribution is strictly prohibited.
      </p>

      <h3>6. Governing Law</h3>
      <p>
        These Terms & Conditions and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of India, with exclusive jurisdiction in the courts of New Delhi.
      </p>

      <h3>7. Contact Information</h3>
      <p>
        Questions about the Terms & Conditions should be sent to us at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>{" "}
        or mailed to:
      </p>
      <p>
        <strong>Luvtale</strong>
        <br />
        421-A, Near Dada Jungi Lane, Shahpur Jat
        <br />
        New Delhi - 110049, India
      </p>
    </PolicyLayout>
  );
}
