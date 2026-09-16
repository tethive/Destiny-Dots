import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { contactConfig, siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="15 September 2026"
      intro={`These terms govern your use of ${siteConfig.name}. By creating an account or using the platform, you agree to them.`}
    >
      <h2>1. Your account</h2>
      <p>
        You must provide accurate information when signing up and keep your login details secure. You&apos;re
        responsible for activity on your account. One account is for one person — please don&apos;t share access.
      </p>

      <h2>2. What we provide</h2>
      <p>
        {siteConfig.name} offers curated career roadmaps (&quot;paths&quot;) made up of milestones (&quot;dots&quot;),
        each linking to learning resources, along with related tools such as certification guides, job listings and a
        resume builder. Some resources are hosted by third parties; we don&apos;t control their availability or content.
      </p>
      <p>
        We work hard to keep content accurate and current, but we can&apos;t guarantee any particular outcome, job
        offer or certification result.
      </p>

      <h2>3. Free and paid access</h2>
      <ul>
        <li>The first dots of each path are free with an account.</li>
        <li>One-off purchases unlock a specific dot or path for the lifetime of the platform.</li>
        <li>Pro subscriptions unlock all paths for the billing period and renew automatically until cancelled.</li>
        <li>
          Payments are processed by Razorpay. Access is granted once payment is confirmed. See our{" "}
          <Link href="/refund-policy">refund & cancellation policy</Link>.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>copy, resell or redistribute paid content or path structures;</li>
        <li>scrape the platform or attempt to bypass access controls;</li>
        <li>use the platform for anything unlawful or harmful.</li>
      </ul>

      <h2>5. Intellectual property</h2>
      <p>
        Path structures, descriptions, guides and branding are owned by {siteConfig.legalEntity}. Third-party resources
        remain the property of their respective owners.
      </p>

      <h2>6. Suspension and termination</h2>
      <p>
        We may suspend or close accounts that break these terms. You can delete your account at any time by contacting
        us.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these terms. If changes are significant, we&apos;ll notify you by email or in the app before they
        take effect.
      </p>

      <h2>8. Governing law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>9. Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a>.
      </p>
    </LegalPage>
  );
}
