"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Eye, ExternalLink, Newspaper } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UpdateMeta as Meta } from "@/components/app/update-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export type UpdateItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  domainTags: string[];
  readMinutes: number;
  publishedAt: Date | string | null;
  isSample: boolean;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

/** Full post in a modal — the same content as /updates/[slug], without leaving the list. */
function UpdateBody({ post }: { post: UpdateItem }) {
  return (
    <>
      <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
        <DialogTitle className="pr-8 text-xl leading-snug font-semibold tracking-tight sm:text-2xl">{post.title}</DialogTitle>
        <DialogDescription className="sr-only">Full tech update</DialogDescription>
        <Meta tags={post.domainTags} date={post.publishedAt ? new Date(post.publishedAt) : null} minutes={post.readMinutes} sample={post.isSample} />
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        <div className="prose-dd mt-5 border-t pt-5 [&_h2]:mt-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} unwrapDisallowed>
            {post.body}
          </ReactMarkdown>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 sm:px-6">
        <p className="text-xs text-muted-foreground">
          {post.sourceName ? `Source: ${post.sourceName}` : "Written by the Destiny Dots team"}
        </p>
        <div className="flex gap-2">
          {post.sourceUrl && (
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
                Read the full article <ExternalLink data-icon="inline-end" />
              </a>
            </Button>
          )}
          <Button asChild size="sm" variant="ghost" className="rounded-full">
            <Link href={`/updates/${post.slug}`}>
              Open as page <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}

function UpdateDialog({ post, trigger }: { post: UpdateItem; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <UpdateBody post={post} />
      </DialogContent>
    </Dialog>
  );
}

/** Admin table: small preview button. */
export function UpdatePreviewButton({ post }: { post: UpdateItem }) {
  return (
    <UpdateDialog
      post={post}
      trigger={
        <Button variant="ghost" size="icon" aria-label={`Preview ${post.title}`}>
          <Eye />
        </Button>
      }
    />
  );
}

/** Student feed: featured card plus a grid, each opening the modal. */
export function UpdateFeed({ posts }: { posts: UpdateItem[] }) {
  const reduce = useReducedMotion();
  const [featured, ...rest] = posts;
  if (!featured) return null;

  return (
    <>
      <UpdateDialog
        post={featured}
        trigger={
          <button
            type="button"
            className="group relative isolate block w-full overflow-hidden rounded-3xl border bg-card p-6 text-left shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 sm:p-8"
          >
            <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" aria-hidden />
            <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <Newspaper className="size-4" /> Featured
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{featured.title}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{featured.excerpt}</p>
            <Meta tags={featured.domainTags} date={featured.publishedAt ? new Date(featured.publishedAt) : null} minutes={featured.readMinutes} sample={featured.isSample} />
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Read update <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </button>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rest.map((p, i) => (
          <motion.div
            key={p.id}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04, ease: [0.22, 1, 0.36, 1] }}
          >
            <UpdateDialog
              post={p}
              trigger={
                <button
                  type="button"
                  className="flex h-full w-full flex-col rounded-2xl border bg-card p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <Meta tags={p.domainTags} date={p.publishedAt ? new Date(p.publishedAt) : null} minutes={p.readMinutes} sample={p.isSample} />
                    {p.sourceName && (
                      <Badge variant="outline" className="mt-3 shrink-0 max-w-32 truncate text-[10px]">
                        {p.sourceName}
                      </Badge>
                    )}
                  </div>
                </button>
              }
            />
          </motion.div>
        ))}
      </div>
    </>
  );
}
