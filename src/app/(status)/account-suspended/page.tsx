import type { Metadata } from "next";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Account suspended", robots: { index: false } };

export default function AccountSuspendedPage() {
  return (
    <StatusScreen
      tone="error"
      icon={ShieldOff}
      code="Account suspended"
      title="This account is currently suspended"
      description={
        <>
          Access has been paused, usually because of a policy or payment issue. If you think this is a mistake, write to us at{" "}
          <a href={`mailto:${contactConfig.email}`} className="font-medium text-foreground underline underline-offset-4">
            {contactConfig.email}
          </a>{" "}
          from your account email and we&apos;ll look into it.
        </>
      }
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/contact">Contact support</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  );
}
