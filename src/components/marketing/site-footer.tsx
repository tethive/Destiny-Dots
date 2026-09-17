import Link from "next/link";
import { LogoBadge } from "@/components/brand/logo";
import { SocialLinks } from "@/components/marketing/social-links";
import { ThemeSegmented } from "@/components/theme/theme-toggle";
import { contactConfig, footerNav, siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30 pb-24 lg:pb-0">
      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-xs">
          <Link href="/" aria-label="Destiny Dots home" className="inline-flex items-center gap-3 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <LogoBadge size={72} />
            <span className="text-lg font-semibold tracking-tight">Destiny Dots</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Structured career roadmaps with hand-picked resources — one dot at a time.
          </p>
          {contactConfig.email && (
            <a
              href={`mailto:${contactConfig.email}`}
              className="mt-4 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {contactConfig.email}
            </a>
          )}
          <SocialLinks className="mt-6" />
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerNav.map((group) => (
            <div key={group.title}>
              <p className="text-sm font-medium">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalEntity}. Made in India for students everywhere.
          </p>
          <ThemeSegmented />
        </div>
      </div>
    </footer>
  );
}
