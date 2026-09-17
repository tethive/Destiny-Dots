import type { Metadata } from "next";
import Link from "next/link";
import { Send } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { requireFlash } from "@/lib/flash";
import { contactConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Message sent", robots: { index: false } };

export default async function MessageSentPage() {
  await requireFlash("message-sent", "/contact");
  return (
    <StatusScreen
      tone="success"
      icon={Send}
      code="Message sent"
      title="Thanks — we've got your message"
      description={`We've emailed you a copy and will reply to that address as soon as we can. Urgent? Call or WhatsApp ${contactConfig.phone}.`}
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/resources">Explore career paths</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/">Go home</Link>
          </Button>
        </>
      }
    />
  );
}
