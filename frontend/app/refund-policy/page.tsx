import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Refunds & Returns Policy | Luvtale" };

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      active="/refund-policy"
      title="Refunds & Returns Policy"
      lead="Our commitment to delivering defect-free, handcrafted luxury couture."
    >
      <h3>Returns</h3>
      <p>
        All products are Handcrafted and made-to-measure. Returns are not applicable unless the product has been received defective (torn, damaged, etc.).
      </p>
      <p>
        Luvtale shall make all endeavours to deliver defect-free products to the purchasers.
      </p>
      <p>
        Luvtale does not take title to any returned items purchased by the user unless the item is received by Luvtale. Any item purchased on our website does not qualify for any return unless the product delivered is damaged or has manufacturing defects. The defective and/or damaged goods so received shall be communicated to Luvtale within 24 hours of its receipt. Any communication received after 24 hours of delivery shall not qualify for return unless expressly covered by the product warranty even in case the said product has been wrongly delivered.
      </p>
      <p>
        Luvtale will not provide the option of exchange for reasons like color mismatch and exchange for size.
      </p>
      <p>
        No money for the returned product will be refunded; however, a credit note will be generated for the value of returned goods.
      </p>
      <p>
        However, in the case of a possible size alteration, we can accommodate the request at an added cost where all shipping costs will be borne by the customer.
      </p>

      <h3>Refunds (if applicable)</h3>
      <p>
        Once your return is received and inspected, we will send you an email to notify you that we have received your returned item. We will also notify you of the approval or rejection of your refund.
      </p>
      <p>
        If you are approved, then your refund will be processed, and a credit will automatically be applied to your credit card or original method of payment, within a certain amount of days.
      </p>

      <h3>Late or Missing Refunds (if applicable)</h3>
      <p>
        If you haven’t received a refund yet, first check your bank account again.
      </p>
      <p>
        Then contact your credit card company; it may take some time before your refund is officially posted.
      </p>
      <p>
        Next contact your bank. There is often some processing time before a refund is posted.
      </p>
      <p>
        If you’ve done all of this and you still have not received your refund yet, please contact us at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>
        .
      </p>

      <h3>Exchanges (if applicable)</h3>
      <p>
        We only replace items if they are defective or damaged. If you need to exchange it for the same item, send us an email at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>{" "}
        and send your item to: <strong>Luvtale, 421-A, Near Dada Jungi Lane, Shahpur Jat, New Delhi - 110049, India</strong>.
      </p>

      <h3>Shipping</h3>
      <p>
        To return your product, you should mail your product to: <strong>Luvtale, 421-A, Near Dada Jungi Lane, Shahpur Jat, New Delhi - 110049, India</strong>.
      </p>
      <p>
        You will be responsible for paying for your own shipping costs for returning your item. Shipping costs are non-refundable. If you receive a refund, the cost of return shipping will be deducted from your refund.
      </p>
      <p>
        Depending on where you live, the time it may take for your exchanged product to reach you may vary.
      </p>
    </PolicyLayout>
  );
}
