import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="15 September 2026"
      intro="What we collect, why we collect it, and the choices you have. We aim to collect only what we need to help you learn."
    >
      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details</strong> — name, email address and a securely hashed password (or your Google profile
          basics if you sign in with Google).
        </li>
        <li>
          <strong>Learning profile</strong> — your stage, domains of interest, weekly time and goals from the onboarding
          quiz.
        </li>
        <li>
          <strong>Activity</strong> — paths you enrol in, dots you complete and resources you bookmark.
        </li>
        <li>
          <strong>Payment records</strong> — order and subscription status. Card, UPI and bank details are handled by
          Razorpay; we never see or store them.
        </li>
        <li>
          <strong>Resume builder content</strong> — information you choose to enter to generate your resume.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account, track your progress and unlock content you&apos;ve paid for.</li>
        <li>To recommend paths based on your interests.</li>
        <li>To send essential service emails (receipts, security notices). Product updates are optional.</li>
        <li>To understand, in aggregate, where students get stuck so we can improve paths.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We don&apos;t sell your personal data. We share it only with service providers that help us run the platform —
        such as hosting, database, email and payment processing (Razorpay) — and only as needed to provide the service,
        or where required by law.
      </p>

      <h2>Your rights</h2>
      <p>
        In line with India&apos;s Digital Personal Data Protection Act, 2023, you can ask to access, correct or delete
        your personal data, or withdraw consent, by emailing us. We&apos;ll respond within a reasonable time.
      </p>

      <h2>Retention and security</h2>
      <p>
        We keep your data while your account is active and delete or anonymise it after you close your account, except
        where we must keep records (for example, payment records for tax purposes). Data is encrypted in transit and
        access is restricted to people who need it.
      </p>

      <h2>Cookies</h2>
      <p>We use essential cookies to keep you logged in. Any optional analytics will be clearly disclosed.</p>

      <h2>Contact</h2>
      <p>
        Privacy questions or requests: <a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a>.
      </p>
    </LegalPage>
  );
}
