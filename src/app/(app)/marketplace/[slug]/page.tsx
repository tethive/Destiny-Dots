import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Clock, ExternalLink, Pencil, ShieldCheck, ShoppingBag } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DomainBadge } from "@/components/domain";
import { BuyProjectButton } from "@/components/marketplace/buy-button";
import { DisputeDialog, ReviewForm } from "@/components/marketplace/buyer-tools";
import { ProjectGallery } from "@/components/marketplace/gallery";
import { Stars } from "@/components/marketplace/project-card";
import { SourceBrowser } from "@/components/marketplace/source-browser";
import { Button } from "@/components/ui/button";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { skillLevelLabels } from "@/lib/labels";
import { formatINR } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { daysAgo } from "@/lib/utils";
import { getSetting } from "@/server/settings";

export async function generateMetadata(props: PageProps<"/marketplace/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await db.project.findUnique({ where: { slug }, select: { title: true, summary: true } });
  return { title: p?.title ?? "Project", description: p?.summary };
}

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default async function ProjectPage(props: PageProps<"/marketplace/[slug]">) {
  const { slug } = await props.params;
  const user = await requireUser(`/marketplace/${slug}`);
  const project = await db.project.findUnique({
    where: { slug },
    include: {
      files: { orderBy: [{ kind: "asc" }, { order: "asc" }] },
      seller: { select: { id: true, name: true, createdAt: true, sellerProfile: { select: { displayName: true, bio: true } } } },
      reviews: { orderBy: { createdAt: "desc" }, take: 30, include: { buyer: { select: { name: true } } } },
    },
  });
  const isOwner = project?.sellerId === user.id;
  const isAdmin = user.role === "admin";
  if (!project || (project.status !== "APPROVED" && !isOwner && !isAdmin)) {
    // Buyers keep access to archived listings they paid for.
    const purchased = project && (await db.projectPurchase.findUnique({ where: { projectId_buyerId: { projectId: project.id, buyerId: user.id } } }));
    if (!purchased || purchased.status === "REFUNDED") notFound();
  }

  const [purchase, settings, sellerStats] = await Promise.all([
    db.projectPurchase.findUnique({ where: { projectId_buyerId: { projectId: project.id, buyerId: user.id } }, include: { dispute: true } }),
    getSetting("marketplace"),
    db.project.aggregate({ where: { sellerId: project.sellerId, status: "APPROVED" }, _count: true, _sum: { salesCount: true } }),
  ]);
  const owns = purchase && purchase.status !== "REFUNDED";
  const canBrowse = owns || isOwner || isAdmin;
  const images = project.files.filter((f) => f.kind === "COVER" || f.kind === "SCREENSHOT").map((f) => f.key);
  const source = project.files.find((f) => f.kind === "SOURCE");
  const myReview = project.reviews.find((r) => r.buyerId === user.id);
  const seller = project.seller.sellerProfile?.displayName ?? project.seller.name;
  const disputeOpen = purchase && !purchase.dispute && purchase.status === "PAID" && !purchase.payoutId && purchase.createdAt > daysAgo(settings.holdDays);

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/marketplace" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Marketplace
      </Link>

      {project.status !== "APPROVED" && (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          This listing is <b>{project.status.toLowerCase()}</b> and isn&apos;t visible to other students.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0">
          <ProjectGallery images={images} title={project.title} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap gap-2">
            {project.domainTags.map((t) => (
              <DomainBadge key={t} tag={t as DomainTag} label={getDomain(t)?.short ?? t} />
            ))}
            <span className="rounded-full border px-2 py-0.5 text-xs">{skillLevelLabels[project.level]}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-balance sm:text-3xl">{project.title}</h1>
          <p className="text-muted-foreground">{project.summary}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Stars value={project.ratingAvg} count={project.ratingCount} />
            <span className="text-muted-foreground">· {project.salesCount} sold</span>
            {project.approvedAt && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3.5" /> {day(project.approvedAt)}
              </span>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            {owns ? (
              <>
                <p className="flex items-center gap-2 font-semibold text-success">
                  <BadgeCheck className="size-5" /> You own this project
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Browse the files below or download the ZIP any time.</p>
                {purchase.dispute && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">Your report is {purchase.dispute.status === "OPEN" ? "being reviewed" : `resolved (${purchase.dispute.status.toLowerCase()})`}.</p>}
                {disputeOpen && (
                  <div className="mt-2">
                    <DisputeDialog purchaseId={purchase.id} holdDays={settings.holdDays} />
                  </div>
                )}
              </>
            ) : isOwner ? (
              <Button asChild size="lg" className="h-11 w-full rounded-full">
                <Link href={`/marketplace/sell/${project.id}`}>
                  <Pencil data-icon="inline-start" /> Edit your listing
                </Link>
              </Button>
            ) : project.status === "APPROVED" && settings.enabled ? (
              <>
                <p className="text-3xl font-semibold tabular-nums">{formatINR(project.priceInr)}</p>
                <p className="mb-4 text-sm text-muted-foreground">One-time payment · lifetime access</p>
                <BuyProjectButton projectId={project.id} priceInr={project.priceInr} />
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <ShoppingBag className="mt-0.5 size-4 shrink-0" /> Full source code ZIP, browsable in the app
                  </li>
                  <li className="flex gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" /> {settings.holdDays}-day buyer protection if files are missing or not as described
                  </li>
                </ul>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">This project isn&apos;t available to buy right now.</p>
            )}
            {project.demoUrl && (
              <Button asChild variant="outline" size="lg" className="mt-3 w-full rounded-full">
                <a href={project.demoUrl} target="_blank" rel="noopener noreferrer nofollow ugc">
                  Live demo <ExternalLink data-icon="inline-end" />
                </a>
              </Button>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-4 text-sm shadow-xs">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Seller</p>
            <p className="mt-1 font-semibold">{seller}</p>
            {project.seller.sellerProfile?.bio && <p className="mt-1 text-muted-foreground">{project.seller.sellerProfile.bio}</p>}
            <p className="mt-2 text-xs text-muted-foreground">
              {sellerStats._count} listing{sellerStats._count === 1 ? "" : "s"} · {sellerStats._sum.salesCount ?? 0} sales · member since {day(project.seller.createdAt)}
            </p>
          </div>
        </aside>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <section className="min-w-0">
          <h2 className="text-lg font-semibold">About this project</h2>
          <div className="prose-dd mt-3 [&_a]:text-primary [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_ul]:list-disc [&_ul]:pl-5">
            {/* Seller-written Markdown: raw HTML and images are not rendered. */}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              disallowedElements={["img"]}
              unwrapDisallowed
              components={{ a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">{children}</a> }}
            >
              {project.description}
            </ReactMarkdown>
          </div>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {project.techStack.map((t) => (
              <span key={t} className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-xs">
                {t}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Reviews</h2>
          <div className="mt-3 space-y-3">
            {owns && <ReviewForm projectId={project.id} initial={myReview ? { rating: myReview.rating, body: myReview.body } : undefined} />}
            {project.reviews.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
            {project.reviews.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-4 text-sm shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{r.buyer.name.split(" ")[0]}</span>
                  <Stars value={r.rating} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{r.body}</p>
                <p className="mt-2 text-xs text-muted-foreground">{day(r.createdAt)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {canBrowse && source && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Project files</h2>
          <SourceBrowser projectId={project.id} downloadKey={source.key} archiveName={source.name} />
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        For learning and portfolio reference. Submitting purchased work as your own academic assignment may break your institution&apos;s rules.
      </p>
    </div>
  );
}
