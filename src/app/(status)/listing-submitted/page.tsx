import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { StatusDetails, StatusScreen } from "@/components/status/status-screen";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/pricing";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Listing submitted", robots: { index: false } };

export default async function ListingSubmittedPage(props: PageProps<"/listing-submitted">) {
  const user = await requireUser("/marketplace/sell");
  const { id } = await props.searchParams;
  const project =
    typeof id === "string" ? await db.project.findFirst({ where: { id, sellerId: user.id }, select: { id: true, title: true, priceInr: true, status: true } }) : null;

  if (!project) redirect("/marketplace/sell");

  return (
    <StatusScreen
      tone="success"
      icon={ClipboardCheck}
      code="Submitted for review"
      title="Your project is in the review queue"
      description="Our team checks every listing for originality, a working README and no secrets in the code. We'll email you as soon as it's approved or if anything needs changing."
      actions={
        <>
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href="/marketplace/sell">Seller dashboard</Link>
          </Button>
          {project && (
            <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-6">
              <Link href={`/marketplace/sell/${project.id}`}>View listing</Link>
            </Button>
          )}
        </>
      }
    >
      {project && (
        <StatusDetails
          rows={[
            ["Project", project.title],
            ["Price", formatINR(project.priceInr)],
            ["Status", project.status === "PENDING" ? "In review" : project.status.toLowerCase()],
          ]}
        />
      )}
    </StatusScreen>
  );
}
