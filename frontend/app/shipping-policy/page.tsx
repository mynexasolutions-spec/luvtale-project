import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Shipping Policy | Luvtale Boutique" };

export default function ShippingPolicyPage() {
  return (
    <PolicyLayout
      active="/shipping-policy"
      title="Shipping Policy"
      lead="We offer worldwide shipping. Orders are processed within 2-3 business days..."
    >
      <h3>1. Domestic Shipping</h3>
      <p>
        Luvtale Boutique delivers all across India. We offer standard free shipping on all orders, with no minimum
        purchase required. We partner with leading logistics providers to ensure safe and timely delivery of your
        luxury boutique items.
      </p>

      <h3>2. Dispatch and Processing Time</h3>
      <p>
        All orders are processed and dispatched within 24 to 48 hours of order confirmation. Orders placed on
        Sundays or public holidays will be processed on the next business day.
      </p>

      <h3>3. Delivery Timelines</h3>
      <p>
        For major metro cities, delivery usually takes 3 to 5 business days from the dispatch date. For regional or
        remote areas, delivery may take between 5 to 7 business days.
      </p>

      <h3>4. International Shipping</h3>
      <p>
        We offer worldwide international shipping to select countries. International shipping fees and delivery
        timelines are calculated at checkout based on destination and package weight.
      </p>

      <h3>5. Customs, Duties &amp; Taxes</h3>
      <p>
        For international shipments, Luvtale Boutique is not responsible for any customs duties, taxes, or clearance
        fees levied by the destination country. These charges are the sole responsibility of the customer.
      </p>

      <h3>6. Order Tracking</h3>
      <p>
        Once your order has been dispatched, you will receive a tracking link via email and SMS to monitor your
        shipment&apos;s progress in real-time.
      </p>
    </PolicyLayout>
  );
}
