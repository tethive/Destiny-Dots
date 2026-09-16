import { CommandMenuProvider } from "@/components/command-menu";
import { MobileDock } from "@/components/marketing/mobile-dock";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { publicDomainCounts } from "@/server/catalog";
import { searchPaths } from "@/server/search";

// Catalogue, prices and counts come from the database and change from the admin panel.
export const dynamic = "force-dynamic";

export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const [domainCounts, pathItems] = await Promise.all([publicDomainCounts(), searchPaths()]);
  return (
    <CommandMenuProvider pathItems={pathItems}>
      <div className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <SiteHeader domainCounts={domainCounts} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <MobileDock />
      </div>
    </CommandMenuProvider>
  );
}
