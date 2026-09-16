"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, ChevronDown, Menu, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useCommandMenu } from "@/components/command-menu";
import { DomainIcon } from "@/components/domain";
import { ThemeSegmented, ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/lib/auth-client";
import { domains } from "@/lib/catalog";
import type { DomainCounts } from "@/server/catalog";
import { marketingNav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ domainCounts }: { domainCounts: DomainCounts }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const { open: openSearch } = useCommandMenu();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openMega = () => {
    clearTimeout(closeTimer.current);
    setMegaOpen(true);
  };
  const closeMega = () => {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 120);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b transition-[background-color,border-color] duration-200",
        scrolled || megaOpen ? "border-border bg-background/80 backdrop-blur-xl" : "border-transparent bg-background/0",
      )}
    >
      <div className="container-page relative flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
            {marketingNav.map((item) => {
              const active = isActivePath(pathname, item.href);
              const isResources = item.href === "/resources";
              return (
                <div
                  key={item.href}
                  onMouseEnter={isResources ? openMega : undefined}
                  onMouseLeave={isResources ? closeMega : undefined}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMegaOpen(false)}
                    onFocus={isResources ? openMega : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-9 items-center gap-1 rounded-full px-3.5 text-sm font-medium transition-colors",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-muted"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    {item.label}
                    {isResources && (
                      <ChevronDown className={cn("size-3.5 transition-transform", megaOpen && "rotate-180")} aria-hidden />
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            className="flex h-9 items-center gap-2 rounded-full border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Search (Ctrl+K)"
          >
            <Search className="size-4" aria-hidden />
            <span className="hidden xl:inline">Search</span>
            <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] xl:inline">Ctrl K</kbd>
          </button>
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="lg" className="hidden rounded-full px-4 sm:inline-flex">
              <Link href="/welcome">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="lg" className="hidden rounded-full px-3.5 md:inline-flex">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="lg" className="hidden rounded-full px-4 sm:inline-flex">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex size-9 items-center justify-center rounded-full border text-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </button>
        </div>

        {/* Resources mega menu */}
        <AnimatePresence>
          {megaOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
              className="absolute inset-x-4 top-[calc(100%+6px)] hidden overflow-hidden rounded-2xl border bg-popover p-3 shadow-2xl shadow-foreground/10 lg:block xl:inset-x-8"
            >
              <div className="grid grid-cols-[1fr_280px] gap-3">
                <div className="p-2">
                  <p className="px-2 font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                    {domains.length} domains
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-0.5">
                    {domains.map((d) => {
                      const count = domainCounts[d.tag]?.paths ?? 0;
                      return (
                        <Link
                          key={d.tag}
                          href={`/resources/${d.tag}`}
                          onClick={() => setMegaOpen(false)}
                          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                        >
                          <DomainIcon tag={d.tag} className="size-9 [&_svg]:size-4" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{d.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {count} {count === 1 ? "path" : "paths"}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                <Link
                  href="/resources"
                  onClick={() => setMegaOpen(false)}
                  className="group relative flex flex-col justify-end overflow-hidden rounded-xl border bg-muted/50 p-5"
                >
                  <div className="bg-grid absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" aria-hidden />
                  <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-3xl" aria-hidden />
                  <p className="relative text-base font-semibold">Explore every roadmap</p>
                  <p className="relative mt-1 text-sm text-muted-foreground">See each path dot by dot before you sign up.</p>
                  <span className="relative mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    All resources <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="flex w-[88vw] max-w-sm flex-col gap-0 overflow-y-auto p-0">
          <div className="flex h-16 items-center border-b px-5">
            <SheetTitle asChild>
              <span className="text-sm font-semibold">Menu</span>
            </SheetTitle>
            <SheetDescription className="sr-only">Site navigation</SheetDescription>
          </div>
          <nav aria-label="Mobile" className="flex flex-col px-3 py-3">
            {marketingNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-3 text-base font-medium",
                  isActivePath(pathname, item.href) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <ArrowRight className="size-4 opacity-40" aria-hidden />
              </Link>
            ))}
          </nav>

          <div className="border-t px-5 py-5">
            <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">Jump to a domain</p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              {domains.map((d) => (
                <Link
                  key={d.tag}
                  href={`/resources/${d.tag}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
                >
                  <DomainIcon tag={d.tag} className="size-6 rounded-md [&_svg]:size-3.5" />
                  <span className="truncate">{d.short}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-4 border-t px-5 py-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeSegmented />
            </div>
            {signedIn ? (
              <Button asChild size="lg" className="h-10 w-full rounded-full">
                <Link href="/welcome" onClick={() => setMobileOpen(false)}>
                  Go to dashboard
                </Link>
              </Button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="lg" className="h-10 rounded-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild size="lg" className="h-10 rounded-full">
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    Get started
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
