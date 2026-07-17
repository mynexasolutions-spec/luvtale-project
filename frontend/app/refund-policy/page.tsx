import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Cancellation & Refund Policy | Luvtale Boutique" };

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      active="/refund-policy"
      title="Cancellation & Refund Policy"
      lead="We offer a 14-day return policy for unused items. Refunds will be processed to the original payment method..."
    >
      <h3>1. Order Cancellation</h3>
      <p>
        You can request to cancel your order within 24 hours of placement. Once the order has been processed and
        dispatched, we cannot accept cancellation requests. To cancel your order, please email us immediately at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>
        .
      </p>

      <h3>2. Return Window</h3>
      <p>
        We accept returns for eligible items within 14 days of delivery. If 14 days have gone by since your
        delivery, unfortunately, we cannot offer you a refund or exchange.
      </p>

      <h3>3. Conditions for Return</h3>
      <p>
        To be eligible for a return, your item must be unused, unwashed, and in the same condition that you received
        it, with all original tags, labels, and boutique packaging intact. Custom-tailored or altered outfits are
        not eligible for returns.
      </p>

      <h3>4. Refund Processing</h3>
      <p>
        Once your return is received and inspected by our quality control team, we will send you an email to notify
        you of the approval or rejection of your refund. If approved, your refund will be processed and
        automatically credited back to your original payment method within 7 to 10 business days.
      </p>

      <h3>5. Exchange Options</h3>
      <p>
        If you require a different size or variant, we offer easy exchanges. Please contact our support team within
        7 days of delivery to initiate an exchange request, subject to stock availability.
      </p>
    </PolicyLayout>
  );
}
