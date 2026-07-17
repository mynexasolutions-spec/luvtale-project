import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Privacy Policy | Luvtale Boutique" };

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      active="/privacy-policy"
      title="Privacy Policy"
      lead="Our Privacy Policy explains how we collect, use, and protect your personal information..."
    >
      <h3>1. Collection of Information</h3>
      <p>
        At Luvtale Boutique, we collect information from you when you register on our site, place an order,
        subscribe to our newsletter, or fill out a form. When ordering or registering on our site, as appropriate,
        you may be asked to enter your name, e-mail address, mailing address, phone number, or credit card
        information.
      </p>

      <h3>2. Secure Database &amp; Billing Protection</h3>
      <p>
        We implement a variety of security measures to maintain the safety of your personal information when you
        place an order or enter, submit, or access your personal information. We offer the use of a secure server.
        All supplied sensitive/credit information is transmitted via Secure Socket Layer (SSL) technology and then
        encrypted into our payment gateway providers&apos; database, only to be accessible by those authorized with
        special access rights to such systems, and are required to keep the information confidential. After a
        transaction, your private information (credit cards, social security numbers, financials, etc.) will not be
        stored on our servers.
      </p>

      <h3>3. Use of Cookies</h3>
      <p>
        Yes, we use cookies (which are small files that a site or its service provider transfers to your computer&apos;s
        hard drive through your Web browser, if you allow) to help us remember and process the items in your
        shopping cart, understand and save your preferences for future visits, and compile aggregate data about site
        traffic and site interaction so that we can offer better site experiences and tools in the future.
      </p>

      <h3>4. Sharing and Disclosure Rules</h3>
      <p>
        We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information.
        This does not include trusted third parties who assist us in operating our website, conducting our business,
        or servicing you, so long as those parties agree to keep this information confidential. We may also release
        your information when we believe release is appropriate to comply with the law, enforce our site policies,
        or protect ours or others&apos; rights, property, or safety.
      </p>

      <h3>5. Compliance (GDPR, CCPA &amp; SPDI)</h3>
      <p>
        We value your privacy rights and have taken the necessary precautions to be in compliance with global
        standards, including GDPR, CCPA, and regional Indian SPDI Rules. You have the right to request access to,
        deletion of, or correction of your personal data collected by Luvtale Boutique at any time by contacting our
        support team.
      </p>
    </PolicyLayout>
  );
}
