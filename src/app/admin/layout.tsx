import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppShell } from "@/components/app/app-shell";
import { CommandMenuProvider } from "@/components/command-menu";
import { Toaster } from "@/components/ui/sonner";
import { requireAdmin } from "@/lib/session";
import { searchPaths } from "@/server/search";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin · Destiny Dots" } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const [cookieStore, pathItems] = await Promise.all([cookies(), searchPaths()]);
  return (
    <CommandMenuProvider mode="app" isAdmin pathItems={pathItems}>
      <AppShell
        area="admin"
        defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
        user={{ name: user.name, email: user.email, image: user.image, role: user.role, isPro: false }}
      >
        {children}
      </AppShell>
      <Toaster richColors closeButton position="top-center" />
    </CommandMenuProvider>
  );
}
