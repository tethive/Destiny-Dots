import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, MailX } from "lucide-react";
import { AutoContinue, ResendVerificationForm } from "@/components/status/status-actions";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { safeRedirectPath } from "@/lib/security";

export const metadata: Metadata = { title: "Email confirmation", robots: { index: false } };

export default async function EmailVerifiedPage(props: PageProps<"/email-verified">) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? safeRedirectPath(sp.next, "") : "";
  const welcome = `/welcome${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  if (error) {
    const expired = error.toLowerCase().includes("expired");
    return (
      <StatusScreen
        tone="error"
        icon={MailX}
        code={expired ? "Link expired" : "Link not valid"}
        title={expired ? "That confirmation link has expired" : "We couldn't confirm your email"}
        description="Confirmation links work once and expire after 24 hours. Enter your email and we'll send a fresh one."
        actions={
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/login">Back to log in</Link>
          </Button>
        }
      >
        <ResendVerificationForm next={next || undefined} />
      </StatusScreen>
    );
  }

  return (
    <StatusScreen
      tone="success"
      icon={MailCheck}
      code="Email confirmed"
      title="You're all set!"
      description="Your email is confirmed and you're signed in. Next, a 60-second quiz to find the career paths that fit you."
      actions={<AutoContinue href={welcome} label="Continue" />}
    />
  );
}
