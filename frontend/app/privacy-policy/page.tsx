import PolicyLayout from "@/components/PolicyLayout";

export const metadata = { title: "Privacy Policy | Luvtale" };

export default function PrivacyPolicyPage() {
  return (
    <PolicyLayout
      active="/privacy-policy"
      title="Privacy Policy"
      lead="This Privacy Policy describes how your personal information is collected, used, and shared when you visit or make a purchase from Luvtale."
    >
      <h3>Personal Information We Collect</h3>
      <p>
        When you visit the Site, we automatically collect certain information about your device, including information about your web browser, IP address, time zone, and some of the cookies that are installed on your device. Additionally, as you browse the Site, we collect information about the individual web pages or products that you view, what websites or search terms referred you to the Site, and information about how you interact with the Site. We refer to this automatically-collected information as “Device Information”.
      </p>

      <p>We collect Device Information using the following technologies:</p>
      <ul>
        <li>
          <strong>“Cookies”</strong> are data files that are placed on your device or computer and often include an anonymous unique identifier. For more information about cookies, and how to disable cookies, visit{" "}
          <a href="http://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>
            http://www.allaboutcookies.org
          </a>.
        </li>
        <li>
          <strong>“Log files”</strong> track actions occurring on the Site, and collect data including your IP address, browser type, Internet service provider, referring/exit pages, and date/time stamps.
        </li>
        <li>
          <strong>“Web beacons”, “tags”, and “pixels”</strong> are electronic files used to record information about how you browse the Site.
        </li>
      </ul>

      <p>
        Additionally when you make a purchase or attempt to make a purchase through the Site, we collect certain information from you, including your name, billing address, shipping address, payment information, email address, and phone number. We refer to this information as “Order Information”.
      </p>
      <p>
        When we talk about “Personal Information” in this Privacy Policy, we are talking both about Device Information and Order Information.
      </p>

      <h3>How Do We Use Your Personal Information?</h3>
      <p>
        We use the Order Information that we collect generally to fulfill any orders placed through the Site (including processing your payment information, arranging for shipping, and providing you with invoices and/or order confirmations). Additionally, we use this Order Information to:
      </p>
      <ul>
        <li>Communicate with you;</li>
        <li>Screen our orders for potential risk or fraud; and</li>
        <li>When in line with the preferences you have shared with us, provide you with information or advertising relating to our products or services.</li>
      </ul>
      <p>
        We use the Device Information that we collect to help us screen for potential risk and fraud (in particular, your IP address), and more generally to improve and optimize our Site (for example, by generating analytics about how our customers browse and interact with the Site, and to assess the success of our marketing and advertising campaigns).
      </p>

      <h3>Sharing Your Personal Information</h3>
      <p>
        We share your Personal Information with trusted third parties to help us use your Personal Information, as described above. For example, we use analytics and secure payment gateways to power our online store and to help us understand how our customers use the Site.
      </p>
      <p>
        Finally, we may also share your Personal Information to comply with applicable laws and regulations, to respond to a subpoena, search warrant or other lawful request for information we receive, or to otherwise protect our rights.
      </p>

      <h3>Behavioural Advertising</h3>
      <p>
        As described above, we use your Personal Information to provide you with targeted advertisements or marketing communications we believe may be of interest to you.
      </p>

      <h3>Do Not Track</h3>
      <p>
        Please note that we do not alter our Site’s data collection and use practices when we see a Do Not Track signal from your browser.
      </p>

      <h3>Your Rights</h3>
      <p>
        You have the right to access personal information we hold about you and to ask that your personal information be corrected, updated, or deleted. If you would like to exercise this right, please contact us through the contact information below.
      </p>

      <h3>Data Retention</h3>
      <p>
        When you place an order through the Site, we will maintain your Order Information for our records unless and until you ask us to delete this information.
      </p>

      <h3>Changes</h3>
      <p>
        We may update this privacy policy from time to time in order to reflect, for example, changes to our practices or for other operational, legal or regulatory reasons.
      </p>

      <h3>Contact Us</h3>
      <p>
        For more information about our privacy practices, if you have questions, or if you would like to make a complaint, please contact us by email at{" "}
        <a href="mailto:luvtaleofficial@gmail.com" className="policy-email">
          luvtaleofficial@gmail.com
        </a>{" "}
        or by mail at:
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
