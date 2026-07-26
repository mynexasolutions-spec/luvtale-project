import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Shipping Policy | Luvtale" };

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      active="/shipping-policy"
      title="Shipping Policy"
      lead="Information regarding shipping, dispatch timelines, and delivery of your Luvtale orders."
    >
      <h3>1. Order Dispatch & Processing</h3>
      <p>
        Because all our products are handcrafted and made-to-measure, dispatch times may vary depending on the intricacy of the piece. Ready-to-ship garments are dispatched within 2 to 4 business days. Made-to-order and bespoke couture pieces are dispatched within the timeline specified on the product page.
      </p>

      <h3>2. Domestic Shipping Across India</h3>
      <p>
        We offer standard shipping on orders across India. Once dispatched, delivery typically takes 3 to 7 business days depending on your location and pincode accessibility.
      </p>

      <h3>3. International Shipping</h3>
      <p>
        We ship worldwide! International shipping rates and estimated delivery timelines are calculated at checkout based on destination country and shipment weight.
      </p>

      <h3>4. Customs, Duties & Import Taxes</h3>
      <p>
        International orders may be subject to import duties, customs taxes, and handling fees levied by the destination country. These charges are the customer&apos;s responsibility and are not included in your product or shipping total paid to Luvtale.
      </p>

      <h3>5. Tracking Your Order</h3>
      <p>
        Once your shipment has been handed over to our courier partner, you will receive an automated email and SMS notification containing your tracking details and tracking link.
      </p>

      <h3>6. Return Shipping Address & Support</h3>
      <p>
        For approved returns or alteration shipments, products must be sent to our official boutique studio:
      </p>
      <p>
        <strong>Luvtale</strong>
        <br />
        421-A, Near Dada Jungi Lane, Shahpur Jat
        <br />
        New Delhi - 110049, India
      </p>
      <p>
        If you have any questions regarding your shipment or delivery status, please contact us at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>
        .
      </p>
    </PolicyLayout>
  );
}
