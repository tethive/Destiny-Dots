import Link from "next/link";
import { Compass } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <StatusScreen
      compact
      tone="warning"
      icon={Compass}
      code="Error 404"
      title="We couldn't find that"
      description="This page, path or item may have been moved, unpublished or deleted."
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
            <Link href="/explore">Explore paths</Link>
          </Button>
        </>
      }
    />
  );
}
