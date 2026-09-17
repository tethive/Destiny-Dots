import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { contactConfig } from "@/lib/site";

/** Minimal page frame (logo + help line) for standalone status pages. */
export function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="container-page flex flex-col items-center justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row">
        <span>© {new Date().getFullYear()} Destiny Dots</span>
        <span>
          Need help?{" "}
          <Link href="/contact" className="font-medium text-foreground hover:underline">
            Contact us
          </Link>{" "}
          or email{" "}
          <a href={`mailto:${contactConfig.email}`} className="font-medium text-foreground hover:underline">
            {contactConfig.email}
          </a>
        </span>
      </footer>
    </div>
  );
}
