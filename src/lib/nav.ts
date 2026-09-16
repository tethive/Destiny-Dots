import {
  Award,
  BadgeIndianRupee,
  Bookmark,
  BookOpenCheck,
  Briefcase,
  ChartNoAxesCombined,
  Compass,
  CreditCard,
  FileText,
  FileUser,
  FolderKanban,
  Inbox,
  Receipt,
  RefreshCw,
  ShieldAlert,
  LayoutDashboard,
  Library,
  Newspaper,
  Route,
  Settings,
  Store,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
export type NavGroup = { label: string; items: NavItem[] };

export const studentNav: NavGroup[] = [
  {
    label: "Learn",
    items: [
      { href: "/dashboard", label: "Home", icon: LayoutDashboard },
      { href: "/my-paths", label: "My paths", icon: Route },
      { href: "/explore", label: "Explore", icon: Compass },
      { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
      { href: "/achievements", label: "Achievements", icon: Trophy },
    ],
  },
  {
    label: "Career",
    items: [
      { href: "/certifications", label: "Certifications", icon: Award },
      { href: "/jobs", label: "Job listings", icon: Briefcase },
      { href: "/updates", label: "Tech updates", icon: Newspaper },
      { href: "/resume", label: "Resume builder", icon: FileUser },
      { href: "/marketplace", label: "Project marketplace", icon: Store },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export const studentMobileNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/my-paths", label: "Paths", icon: Route },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/resume", label: "Resume", icon: FileUser },
  { href: "/settings", label: "Profile", icon: Settings },
];

export const adminNav: NavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Overview", icon: ChartNoAxesCombined }],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/paths", label: "Paths & dots", icon: FolderKanban },
      { href: "/admin/resources", label: "Resource library", icon: Library },
    ],
  },
  {
    label: "People & money",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/payments", label: "Payments", icon: BadgeIndianRupee },
      { href: "/admin/marketplace", label: "Marketplace", icon: Store },
      { href: "/admin/messages", label: "Messages", icon: Inbox },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/content/updates", label: "Tech updates", icon: Newspaper },
      { href: "/admin/content/jobs", label: "Job listings", icon: Briefcase },
      { href: "/admin/content/certifications", label: "Certifications", icon: BookOpenCheck },
      { href: "/admin/content/imports", label: "Auto-imports", icon: RefreshCw },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Settings & audit", icon: FileText },
      { href: "/admin/security", label: "Security", icon: ShieldAlert },
    ],
  },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
