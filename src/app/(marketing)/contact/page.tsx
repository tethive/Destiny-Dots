import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, Phone, TriangleAlert } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/social";
import { ContactForm } from "@/components/marketing/contact-form";
import { PageHero } from "@/components/marketing/section";
import { SocialLinks } from "@/components/marketing/social-links";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Questions, feedback or partnership ideas — get in touch with the Destiny Dots team.",
};

type Channel = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  href?: string;
  hint: string;
};

export default function ContactPage() {
  const channels = [
    contactConfig.email && {
      icon: Mail,
      title: "Email",
      value: contactConfig.email,
      href: `mailto:${contactConfig.email}`,
      hint: "Billing and account questions",
    },
    contactConfig.whatsapp && {
      icon: WhatsappIcon,
      title: "WhatsApp",
      value: "Chat with the team",
      href: `https://wa.me/${contactConfig.whatsapp}`,
      hint: "Quick questions about paths",
    },
    contactConfig.phone && {
      icon: Phone,
      title: "Phone",
      value: contactConfig.phone,
      href: `tel:${contactConfig.phone.replace(/\s/g, "")}`,
      hint: contactConfig.hours || "Call or WhatsApp us",
    },
    contactConfig.address && {
      icon: MapPin,
      title: "Based in",
      value: contactConfig.address,
      hint: "Where our team is based",
    },
  ].filter(Boolean) as Channel[];

  return (
    <>
      <PageHero
        eyebrow="Contact Us"
        title="Let's"
        highlight="talk."
        description="Questions about a path, billing, partnerships or a domain you want next — we read every message."
        compact
      />

      <section className="container-page py-14 sm:py-20">
        {contactConfig.isPlaceholder && process.env.NODE_ENV !== "production" && (
          <div className="mb-10 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Placeholder contact details.</span> Replace them in{" "}
              <code className="font-mono">src/lib/site.ts</code> (<code className="font-mono">contactConfig</code>) and set{" "}
              <code className="font-mono">isPlaceholder: false</code>. Hidden in production builds.
            </p>
          </div>
        )}

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map(({ icon: Icon, title, value, href, hint }) => {
            const inner = (
              <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-colors hover:border-primary/40">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <p className="mt-4 text-xs text-muted-foreground">{title}</p>
                <p className="mt-0.5 font-semibold break-words">{value}</p>
                <p className="mt-auto pt-3 text-sm text-muted-foreground">{hint}</p>
              </div>
            );
            return (
              <StaggerItem key={title}>
                <TiltCard max={4} className="rounded-2xl">
                  {href ? (
                    <a
                      href={href}
                      target={href.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="block h-full"
                    >
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </TiltCard>
              </StaggerItem>
            );
          })}
        </Stagger>

        <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <Reveal className="space-y-8">
            <div>
              <p className="eyebrow">Send a message</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em]">Send us a message</h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Already a student? Write from your registered email so we can find your account faster.
              </p>
            </div>

            {Object.values(contactConfig.socials).some(Boolean) && (
              <div>
                <p className="text-sm font-medium">Follow along</p>
                <SocialLinks className="mt-3" />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Maybe you&apos;re looking for</p>
              {[
                { href: "/pricing", label: "Plans, prices & refunds" },
                { href: "/resources", label: "All domains & career paths" },
                { href: "/about", label: "How we build roadmaps" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="group flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm font-medium transition-colors hover:border-primary/40"
                >
                  {l.label}
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </Link>
              ))}
            </div>

            {contactConfig.hours && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" aria-hidden /> {contactConfig.hours}
              </p>
            )}
          </Reveal>

          <Reveal delay={0.1}>
            <div className="border-beam shadow-xl shadow-foreground/5">
              <div className="rounded-2xl bg-card p-6 sm:p-8">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
