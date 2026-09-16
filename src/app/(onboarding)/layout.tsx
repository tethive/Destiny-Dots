import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GridBackdrop } from "@/components/effects/orbit";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { requireUser } from "@/lib/session";

export default async function OnboardingLayout({ children }: LayoutProps<"/">) {
  await requireUser("/onboarding");
  return (
    <div className="relative isolate min-h-dvh">
      <GridBackdrop />
      <header className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            Go to dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="container-page pb-16">{children}</main>
      <Toaster richColors position="top-center" />
    </div>
  );
}
