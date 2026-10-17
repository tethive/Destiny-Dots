import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TopicRow, type LibraryResource } from "@/components/admin/topic-curator";
import { PageHeader } from "@/components/app/page-header";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { moduleTopics } from "@/server/curriculum";

export async function generateMetadata(props: PageProps<"/admin/curriculum/[code]">): Promise<Metadata> {
  const { code } = await props.params;
  const mod = await moduleTopics(code);
  return { title: mod ? `${code.toUpperCase()} ${mod.name}` : "Module" };
}

export default async function ModulePage(props: PageProps<"/admin/curriculum/[code]">) {
  await requireAdmin();
  const { code } = await props.params;
  const mod = await moduleTopics(code);
  if (!mod) notFound();

  const library: LibraryResource[] = await db.resource.findMany({
    where: { isSample: false },
    orderBy: { updatedAt: "desc" },
    take: 500,
    select: { id: true, title: true, type: true, url: true, isPremium: true },
  });

  const covered = mod.rows.filter((r) => r.resources.length).length;
  const dots = mod.rows.reduce((n, r) => n + r.dotCount, 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/curriculum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> All modules
      </Link>

      <PageHeader
        title={`${code.toUpperCase()} · ${mod.name}`}
        description={`${covered} of ${mod.rows.length} topics curated · this module fills ${dots} dots across the catalogue`}
      />

      <div className="rounded-2xl border bg-card">
        {mod.rows.map((t) => (
          <TopicRow key={t.topicKey} topic={t} library={library} />
        ))}
      </div>
    </div>
  );
}
