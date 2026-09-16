"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, Search, Settings, Shield, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useCommandMenu } from "@/components/command-menu";
import { ThemeSegmented, ThemeToggle } from "@/components/theme/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";
import { adminNav, isNavActive, studentMobileNav, studentNav, type NavItem } from "@/lib/nav";
import { cn, initials } from "@/lib/utils";

export type ShellUser = { name: string; email: string; image?: string | null; role?: string | null; isPro: boolean };

export function AppShell({
  user,
  area,
  defaultOpen,
  children,
}: {
  user: ShellUser;
  area: "student" | "admin";
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nav = area === "admin" ? adminNav : studentNav;
  const mobileNav = area === "student" ? studentMobileNav : undefined;
  const { open: openSearch } = useCommandMenu();

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href={area === "admin" ? "/admin" : "/dashboard"}>
                  <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7 shrink-0" />
                  <span className="grid leading-tight">
                    <span className="truncate font-semibold">Destiny Dots</span>
                    <span className="truncate text-xs text-muted-foreground">{area === "admin" ? "Admin panel" : "Student"}</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          {nav.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isNavActive(pathname, item.href)} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && <SidebarMenuBadge className="text-[10px] text-muted-foreground">{item.badge}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          {area === "student" && !user.isPro && (
            <Link
              href="/billing"
              className="mb-1 rounded-xl border bg-card p-3 text-sm shadow-xs transition-colors hover:border-primary/40 group-data-[collapsible=icon]:hidden"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Sparkles className="size-4 text-primary" /> Go Pro
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Unlock every dot in all 11 domains.</span>
            </Link>
          )}
          <UserMenu user={user} area={area} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 rounded-t-[inherit] border-b bg-background/85 px-3 backdrop-blur-xl sm:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
          <button
            type="button"
            onClick={openSearch}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:max-w-sm"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Search paths, domains, pages…</span>
            <kbd className="ml-auto hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            {user.isPro && area === "student" && (
              <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
                <ShieldCheck className="size-3" /> Pro
              </Badge>
            )}
            {user.role === "admin" && (
              <Link
                href={area === "admin" ? "/dashboard" : "/admin"}
                className="hidden h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                {area === "admin" ? <UserRound className="size-4" /> : <Shield className="size-4" />}
                {area === "admin" ? "Student view" : "Admin"}
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>
        <div className={cn("flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 md:pb-10")}>{children}</div>
      </SidebarInset>

      {mobileNav && <MobileTabBar items={mobileNav} />}
    </SidebarProvider>
  );
}

function UserMenu({ user, area }: { user: ShellUser; area: "student" | "admin" }) {
  const router = useRouter();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                {user.image && <AvatarImage src={user.image} alt="" />}
                <AvatarFallback className="rounded-lg bg-primary/12 text-xs font-semibold text-primary">{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              {user.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href={area === "admin" ? "/dashboard" : "/admin"}>
                    <Shield /> {area === "admin" ? "Student view" : "Admin panel"}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs text-muted-foreground">Theme</span>
              <ThemeSegmented />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await signOut();
                router.push("/");
                router.refresh();
              }}
            >
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function MobileTabBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="App navigation"
      className="fixed inset-x-3 bottom-3 z-40 rounded-2xl border bg-background/90 p-1 shadow-xl shadow-foreground/10 backdrop-blur-xl [padding-bottom:max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-medium",
                  active ? "bg-accent text-primary" : "text-muted-foreground",
                )}
              >
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
