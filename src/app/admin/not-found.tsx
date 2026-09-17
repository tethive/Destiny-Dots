import Link from "next/link";
import { Compass } from "lucide-react";
import { StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <StatusScreen
      compact
      tone="warning"
      icon={Compass}
      code="Error 404"
      title="That record doesn't exist"
      description="It may have been deleted, or the link is out of date."
      actions={
        <Button asChild size="lg" className="h-11 rounded-full px-6">
          <Link href="/admin">Back to admin overview</Link>
        </Button>
      }
    />
  );
}
