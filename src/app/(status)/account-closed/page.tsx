import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PauseCircle, UserX } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { hasFlash } from "@/lib/flash";

export const metadata: Metadata = { title: "Account updated", robots: { index: false } };

export default async function AccountClosedPage() {
  const [paused, deleted] = await Promise.all([hasFlash("account-deactivated"), hasFlash("account-deleted")]);
  if (!paused && !deleted) redirect("/");

  if (paused) {
    return (
      <StatusScreen
        tone="info"
        icon={PauseCircle}
        code="Account paused"
        title="Your account is paused"
        description="You've been signed out everywhere and your listings are hidden. Your progress and purchases are safe. Log in any time to switch everything back on."
        actions={
          <>
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link href="/login">Log in again</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
              <Link href="/">Go home</Link>
            </Button>
          </>
        }
      />
    );
  }

  return (
    <StatusScreen
      tone="warning"
      icon={UserX}
      code="Account deleted"
      title="Your account has been deleted"
      description="We've removed your profile, progress and sign-in details, and emailed you a confirmation. Thanks for learning with Destiny Dots — you're welcome back any time."
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/signup">Start a fresh account</Link>
          </Button>
        </>
      }
    />
  );
}
