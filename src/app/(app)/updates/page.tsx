import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { UpdateFeed } from "@/components/app/update-viewer";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Tech updates" };

export default async function UpdatesPage() {
  const user = await requireUser("/updates");
  const [posts, profile, enrollments] = await Promise.all([
    db.techUpdate.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 50 }),
    db.profile.findUnique({ where: { userId: user.id }, select: { domainInterests: true } }),
    db.enrollment.findMany({ where: { userId: user.id }, select: { path: { select: { domainTag: true } } } }),
  ]);

  // Prioritise posts from enrolled domains and interests, keep recency within groups.
  const mine = new Set([...(profile?.domainInterests ?? []), ...enrollments.map((e) => e.path.domainTag)]);
  const relevance = (tags: string[]) => (tags.length === 0 ? 1 : tags.some((t) => mine.has(t)) ? 2 : 0);
  const sorted = [...posts].sort((a, b) => relevance(b.domainTags) - relevance(a.domainTags));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Tech updates" description="A short, curated feed — prioritised for the domains you follow. Tap any card to read it here." />
      {sorted.length === 0 ? (
        <EmptyState icon={Newspaper} title="No updates yet" description="Our team posts new updates every week." />
      ) : (
        <UpdateFeed posts={sorted} />
      )}
    </div>
  );
}
