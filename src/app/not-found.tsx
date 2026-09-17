import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { StatusShell } from "@/components/status/status-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StatusShell>
      <StatusScreen
        tone="warning"
        icon={Compass}
        code="Error 404"
        title="This dot doesn't connect anywhere"
        description="The page you're looking for has moved or never existed. Check the address, or pick up your path from one of these."
        actions={
          <>
            <Button asChild size="lg" className="h-11 rounded-full px-6">
              <Link href="/">Go home</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
              <Link href="/resources">Explore career paths</Link>
            </Button>
          </>
        }
      />
    </StatusShell>
  );
}
