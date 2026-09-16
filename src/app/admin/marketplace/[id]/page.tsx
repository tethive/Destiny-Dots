import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReviewActions } from "@/components/admin/marketplace-actions";
import { ProjectGallery } from "@/components/marketplace/gallery";
import { SourceBrowser } from "@/components/marketplace/source-browser";
import { Badge } from "@/components/ui/badge";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { skillLevelLabels } from "@/lib/labels";
import { formatINR } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Review listing" };

export default async function AdminProjectPage(props: PageProps<"/admin/marketplace/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const project = await db.project.findUnique({
    where: { id },
    include: {
      files: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
      seller: { select: { id: true, name: true, email: true, createdAt: true, sellerProfile: true, _count: { select: { projects: true } } } },
      purchases: { select: { status: true, amountInr: true } },
    },
  });
  if (!project) notFound();
  const images = project.files.filter((f) => f.kind !== "SOURCE").map((f) => f.key);
  const source = project.files.find((f) => f.kind === "SOURCE");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Marketplace
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Badge variant="outline">{project.status.toLowerCase()}</Badge>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground">{project.summary}</p>
        </div>
        <ReviewActions projectId={project.id} status={project.status} />
      </div>

      {project.rejectionReason && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">Last feedback: {project.rejectionReason}</p>}

      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm">
        <b>Review checklist:</b> original work (search a few distinctive files), no secrets or <code>.env</code> files, no malware or obfuscated scripts, README with setup steps,
        description matches the files, fair price, nothing that enables cheating on live exams.
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ProjectGallery images={images} title={project.title} />
        <dl className="space-y-3 rounded-2xl border bg-card p-5 text-sm shadow-xs">
          {[
            ["Price", formatINR(project.priceInr)],
            ["Level", skillLevelLabels[project.level]],
            ["Domains", project.domainTags.map((t) => getDomain(t)?.short ?? t).join(", ")],
            ["Tech", project.techStack.join(", ")],
            ["Sales", `${project.purchases.filter((p) => p.status !== "REFUNDED").length}`],
            ["Seller", `${project.seller.name} (${project.seller.email})`],
            ["Seller since", project.seller.createdAt.toLocaleDateString("en-IN")],
            ["Seller listings", String(project.seller._count.projects)],
            ["Payout account", project.seller.sellerProfile?.payoutHint ?? "Not set"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
          {project.demoUrl && (
            <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              Live demo <ExternalLink className="size-3.5" />
            </a>
          )}
        </dl>
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Description</h2>
        <div className="prose-dd mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} unwrapDisallowed>
            {project.description}
          </ReactMarkdown>
        </div>
      </section>

      {source ? (
        <SourceBrowser projectId={project.id} downloadKey={source.key} archiveName={source.name} />
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">No source archive uploaded.</p>
      )}
    </div>
  );
}
