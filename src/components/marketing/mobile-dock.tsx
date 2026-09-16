"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BadgeIndianRupee, Compass, House, Info, MessageCircle } from "lucide-react";
import { isActivePath } from "@/components/marketing/site-header";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/about", label: "About", icon: Info },
  { href: "/resources", label: "Resources", icon: Compass },
  { href: "/pricing", label: "Pricing", icon: BadgeIndianRupee },
  { href: "/contact", label: "Contact", icon: MessageCircle },
];

/** Thumb-reachable bottom navigation on phones and small tablets. */
export function MobileDock() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border bg-background/85 p-1 shadow-xl shadow-foreground/10 backdrop-blur-xl [padding-bottom:max(0.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 -z-10 rounded-xl bg-accent"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
