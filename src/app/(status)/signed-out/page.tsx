import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Signed out", robots: { index: false } };

export default function SignedOutPage() {
  return (
    <StatusScreen
      tone="info"
      icon={LogOut}
      code="Signed out"
      title="See you soon"
      description="You've been signed out safely. Your progress is saved — pick up right where you left off next time."
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
