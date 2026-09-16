import { TriangleAlert } from "lucide-react";
import { PageHero } from "@/components/marketing/section";

/**
 * Terms, privacy and refund pages are required for Razorpay merchant
 * onboarding. The copy is a starting draft — have it reviewed before launch.
 * The banner below only renders outside production builds.
 */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHero eyebrow={`Last updated ${updated}`} title={title} description={intro} compact />
      <section className="container-page py-12 sm:py-16">
        {process.env.NODE_ENV !== "production" && (
          <div className="mb-10 flex max-w-3xl gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Draft copy.</span> Review with a legal advisor and fill in company details
              before launch. This notice is hidden in production builds.
            </p>
          </div>
        )}
        <article className="prose-dd max-w-3xl">{children}</article>
      </section>
    </>
  );
}
