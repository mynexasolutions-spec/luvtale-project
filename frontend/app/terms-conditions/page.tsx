import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Terms & Conditions | Luvtale Boutique" };

export default function TermsConditionsPage() {
  return (
    <PolicyLayout
      active="/terms-conditions"
      title="Terms & Conditions"
      lead="By using our boutique, you agree to our terms of service, which include..."
    >
      <h3>1. Terms of Service</h3>
      <p>
        By accessing and purchasing from Luvtale Boutique, you agree to comply with and be bound by the following
        terms and conditions. These terms apply to all visitors, users, and others who access or use our services.
      </p>

      <h3>2. Intellectual Property Rights</h3>
      <p>
        All content, designs, images, logos, graphics, and text on this website are the intellectual property of
        Luvtale Boutique and are protected by applicable copyright and trademark laws. Unauthorized use or
        reproduction of these materials is strictly prohibited.
      </p>

      <h3>3. Product Descriptions and Pricing</h3>
      <p>
        We strive to display our designer ethnic wear products as accurately as possible. However, we cannot
        guarantee that your monitor&apos;s display of any color will be completely accurate. Prices for our products
        are subject to change without notice. We reserve the right to modify or discontinue any product or service
        at any time.
      </p>

      <h3>4. Order Acceptance and Verification</h3>
      <p>
        We reserve the right, at our sole discretion, to refuse or cancel any order for any reason. Some situations
        that may result in your order being canceled include limitations on quantities available for purchase,
        inaccuracies or errors in product or pricing information, or problems identified by our credit and fraud
        avoidance department.
      </p>

      <h3>5. Limitation of Liability</h3>
      <p>
        Luvtale Boutique shall not be liable for any direct, indirect, incidental, special, or consequential damages
        resulting from the use or inability to use our products or services, or for the cost of procurement of
        substitute goods.
      </p>

      <h3>6. Governing Law</h3>
      <p>
        These terms and conditions are governed by and construed in accordance with the laws of India, and you
        irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
      </p>
    </PolicyLayout>
  );
}
