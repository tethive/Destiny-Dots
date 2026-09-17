import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { requireFlash } from "@/lib/flash";

export const metadata: Metadata = { title: "Password updated", robots: { index: false } };

export default async function PasswordUpdatedPage() {
  await requireFlash("password-updated", "/login");
  return (
    <StatusScreen
      tone="success"
      icon={KeyRound}
      code="Password updated"
      title="Your new password is ready"
      description="For your security we signed you out of every device. Log in again with your new password. We've also emailed you a confirmation."
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  );
}
