import { cookies } from "next/headers";
import { AppShell } from "@/components/app/app-shell";
import { CheckoutProvider } from "@/components/app/checkout";
import { CommandMenuProvider } from "@/components/command-menu";
import { Toaster } from "@/components/ui/sonner";
import { requireUser, touchActivity } from "@/lib/session";
import { getAccess } from "@/server/access";
import { searchPaths } from "@/server/search";

export default async function StudentLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [access, cookieStore, pathItems] = await Promise.all([getAccess(user.id), cookies(), searchPaths()]);
  void touchActivity(user.id);

  return (
    <CommandMenuProvider mode="app" isAdmin={user.role === "admin"} pathItems={pathItems}>
      <AppShell
        area="student"
        defaultOpen={cookieStore.get("sidebar_state")?.value !== "false"}
        user={{ name: user.name, email: user.email, image: user.image, role: user.role, isPro: access.plan }}
      >
        <CheckoutProvider user={{ name: user.name, email: user.email }}>{children}</CheckoutProvider>
      </AppShell>
      <Toaster richColors closeButton position="top-center" />
    </CommandMenuProvider>
  );
}
