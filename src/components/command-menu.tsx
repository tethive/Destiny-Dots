"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Command } from "cmdk";
import { CornerDownLeft, FileText, LogIn, Monitor, Moon, Search, Sun, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DomainIcon } from "@/components/domain";
import { domains, getPublishedPaths, pathHref, type DomainTag } from "@/lib/catalog";
import { adminNav, studentNav } from "@/lib/nav";
import { marketingNav } from "@/lib/site";

export type SearchPath = { slug: string; domainTag: DomainTag; title: string; dotCount: number; keywords: string };

const CommandMenuContext = createContext<{ open: () => void }>({ open: () => {} });
export const useCommandMenu = () => useContext(CommandMenuContext);

const itemClass =
  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/85 data-[selected=true]:bg-muted data-[selected=true]:text-foreground";
const groupClass =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";

/** Ctrl+K / ⌘K / "/" — jump to any page, domain or career path, or switch theme. */
export function CommandMenuProvider({
  children,
  mode = "marketing",
  isAdmin = false,
  pathItems,
}: {
  children: React.ReactNode;
  mode?: "marketing" | "app";
  isAdmin?: boolean;
  /** Live path list from the database; falls back to the static catalogue. */
  pathItems?: SearchPath[];
}) {
  const inApp = mode === "app";
  const pages = inApp
    ? [...studentNav, ...(isAdmin ? adminNav : [])].flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label })))
    : marketingNav.map((n) => ({ href: n.href, label: n.label }));
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const paths: SearchPath[] =
    pathItems ??
    getPublishedPaths().map((p) => ({
      slug: p.slug,
      domainTag: p.domainTag,
      title: p.title,
      dotCount: p.dots.length,
      keywords: `${p.roles.join(" ")} ${p.dots.map((d) => d.title).join(" ")}`,
    }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandMenuContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
          <DialogTitle className="sr-only">Search Destiny Dots</DialogTitle>
          <DialogDescription className="sr-only">Search pages, domains and career paths</DialogDescription>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="size-4 text-muted-foreground" aria-hidden />
              <Command.Input
                autoFocus
                placeholder="Search domains, career paths or pages…"
                className="h-12 flex-1 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
              />
              <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-10 text-center text-sm text-muted-foreground">
                No results. Try “cyber”, “SQL” or “Unity”.
              </Command.Empty>

              <Command.Group heading="Pages" className={groupClass}>
                {pages.map((n) => (
                  <Command.Item key={n.href} value={`page ${n.label} ${n.href}`} onSelect={() => go(n.href)} className={itemClass}>
                    <FileText className="size-4 text-muted-foreground" aria-hidden />
                    {n.label}
                  </Command.Item>
                ))}
                {!inApp && (
                  <>
                    <Command.Item value="sign up create account get started" onSelect={() => go("/signup")} className={itemClass}>
                      <UserPlus className="size-4 text-muted-foreground" aria-hidden /> Get started free
                    </Command.Item>
                    <Command.Item value="log in sign in" onSelect={() => go("/login")} className={itemClass}>
                      <LogIn className="size-4 text-muted-foreground" aria-hidden /> Log in
                    </Command.Item>
                  </>
                )}
              </Command.Group>

              <Command.Group heading="Domains" className={groupClass}>
                {domains.map((d) => (
                  <Command.Item
                    key={d.tag}
                    value={`domain ${d.name} ${d.short}`}
                    onSelect={() => go(inApp ? `/explore?domain=${d.tag}` : `/resources/${d.tag}`)}
                    className={itemClass}
                  >
                    <DomainIcon tag={d.tag} className="size-6 rounded-md [&_svg]:size-3.5" />
                    {d.name}
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Career paths" className={groupClass}>
                {paths.map((p) => (
                  <Command.Item
                    key={p.slug}
                    value={`path ${p.title} ${p.keywords}`}
                    onSelect={() => go(inApp ? `/learn/${p.slug}` : pathHref(p))}
                    className={itemClass}
                  >
                    <DomainIcon tag={p.domainTag} className="size-6 rounded-md [&_svg]:size-3.5" />
                    <span className="flex-1 truncate">{p.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{p.dotCount} dots</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Theme" className={groupClass}>
                {[
                  { v: "light", label: "Light theme", icon: Sun },
                  { v: "dark", label: "Dark theme", icon: Moon },
                  { v: "system", label: "System theme", icon: Monitor },
                ].map(({ v, label, icon: Icon }) => (
                  <Command.Item
                    key={v}
                    value={`theme ${label}`}
                    onSelect={() => {
                      setTheme(v);
                      setOpen(false);
                    }}
                    className={itemClass}
                  >
                    <Icon className="size-4 text-muted-foreground" aria-hidden /> {label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
              <span>↑↓ to navigate</span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="size-3" aria-hidden /> to open
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </CommandMenuContext.Provider>
  );
}
