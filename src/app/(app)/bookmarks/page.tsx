import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";
import { BookmarkButton } from "@/components/app/learn";
import { EmptyState, PageHeader } from "@/components/app/page-header";
import { DomainIcon } from "@/components/domain";
import { Button } from "@/components/ui/button";
import type { DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const user = await requireUser("/bookmarks");
  const bookmarks = await db.bookmark.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      resource: {
        include: { dots: { take: 1, include: { dot: { include: { path: { select: { slug: true, title: true, domainTag: true } } } } } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Bookmarks" description="Resources you saved to come back to." />
      {bookmarks.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          description="Tap the bookmark icon on any resource inside a dot to save it here."
          action={
            <Button asChild size="lg" className="rounded-full">
              <Link href="/my-paths">Go to my paths</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {bookmarks.map(({ resource: r }) => {
            const link = r.dots[0]?.dot;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xs">
                {link && <DomainIcon tag={link.path.domainTag as DomainTag} className="size-10" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  {link && (
                    <Link href={`/learn/${link.path.slug}/${link.order}`} className="block truncate text-sm text-muted-foreground hover:text-foreground">
                      {link.path.title} · Dot {link.order}: {link.title}
                    </Link>
                  )}
                </div>
                <BookmarkButton resourceId={r.id} bookmarked />
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <a href={r.url} target="_blank" rel="noopener noreferrer">
                    Open <ExternalLink data-icon="inline-end" />
                  </a>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
