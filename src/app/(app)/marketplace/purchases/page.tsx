import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { ProjectCard } from "@/components/marketplace/project-card";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { projectCardSelect } from "@/server/marketplace";

export const metadata: Metadata = { title: "My purchases" };

export default async function PurchasesPage() {
  const user = await requireUser("/marketplace/purchases");
  const purchases = await db.projectPurchase.findMany({
    where: { buyerId: user.id, status: { not: "REFUNDED" } },
    orderBy: { createdAt: "desc" },
    include: { project: { select: projectCardSelect } },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Marketplace
      </Link>
      <PageHeader title="My purchases" description="Projects you own. Open one to browse its files, download the source or leave a review." />
      {purchases.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No purchases yet"
          description="Projects you buy from other students show up here."
          action={
            <Button asChild>
              <Link href="/marketplace">Browse the marketplace</Link>
            </Button>
          }
        />
      ) : (
        <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {purchases.map((p) => (
            <StaggerItem key={p.id} className="h-full">
              <ProjectCard project={p.project} owned />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
