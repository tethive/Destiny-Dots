import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { ListingEditor } from "@/components/marketplace/seller-forms";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "New listing" };

export default async function NewListingPage() {
  const user = await requireUser("/marketplace/sell/new");
  const [profile, settings] = await Promise.all([db.sellerProfile.findUnique({ where: { userId: user.id } }), getSetting("marketplace")]);
  if (!profile) redirect("/marketplace/sell");

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/marketplace/sell" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Seller dashboard
      </Link>
      <PageHeader title="New listing" description="Start with the details. Once the draft exists you can add images and your source ZIP, then submit it for review." />
      <ListingEditor project={null} limits={{ min: settings.minPriceInr, max: settings.maxPriceInr, commissionPct: settings.commissionPct }} />
    </div>
  );
}
