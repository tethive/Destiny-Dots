import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { UpdateMeta as Meta } from "@/components/app/update-meta";

export async function generateMetadata(props: PageProps<"/updates/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const post = await db.techUpdate.findUnique({ where: { slug }, select: { title: true, excerpt: true } });
  return { title: post?.title ?? "Update", description: post?.excerpt };
}

export default async function UpdatePage(props: PageProps<"/updates/[slug]">) {
  const { slug } = await props.params;
  const user = await requireUser(`/updates/${slug}`);
  const post = await db.techUpdate.findUnique({ where: { slug } });
  if (!post || (!post.isPublished && user.role !== "admin")) notFound();

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/updates" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All updates
      </Link>
      <h1 className="text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl">{post.title}</h1>
      <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
      <Meta tags={post.domainTags} date={post.publishedAt} minutes={post.readMinutes} sample={post.isSample} />
      <div className="prose-dd mt-8 border-t pt-8 [&_h2]:mt-8 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5">
        {/* Markdown is authored by admins only; raw HTML is not rendered. */}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.body}</ReactMarkdown>
      </div>
      {post.sourceUrl && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-xs">
          <p className="text-sm text-muted-foreground">
            Source: <span className="font-medium text-foreground">{post.sourceName ?? new URL(post.sourceUrl).hostname}</span>
          </p>
          <Button asChild size="lg" className="rounded-full">
            <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
              Read the full article <ExternalLink data-icon="inline-end" />
            </a>
          </Button>
        </div>
      )}
    </article>
  );
}
