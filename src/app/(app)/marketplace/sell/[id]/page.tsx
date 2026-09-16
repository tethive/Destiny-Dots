import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ListingEditor } from "@/components/marketplace/seller-forms";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage(props: PageProps<"/marketplace/sell/[id]">) {
  const { id } = await props.params;
  const user = await requireUser(`/marketplace/sell/${id}`);
  const [project, settings] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: { files: { orderBy: { order: "asc" }, select: { id: true, kind: true, key: true, name: true, size: true } }, _count: { select: { purchases: true } } },
    }),
    getSetting("marketplace"),
  ]);
  if (!project || project.sellerId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/marketplace/sell" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Seller dashboard
      </Link>
      <PageHeader
        title={project.title}
        eyebrow={<Badge variant="outline">{project.status === "PENDING" ? "in review" : project.status.toLowerCase()}</Badge>}
        description={project.status === "APPROVED" ? "Live on the marketplace." : "Complete the listing and submit it for review."}
      />
      <ListingEditor
        project={{ ...project, hasBuyers: project._count.purchases > 0 }}
        limits={{ min: settings.minPriceInr, max: settings.maxPriceInr, commissionPct: settings.commissionPct }}
      />
    </div>
  );
}
