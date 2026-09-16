import type { Metadata } from "next";
import Link from "next/link";
import { DeleteContentButton, UpdateEditor } from "@/components/admin/content-editors";
import { UpdatePreviewButton } from "@/components/app/update-viewer";
import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Tech updates" };

const PAGE = 40;
const day = (d: Date | null) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");

export default async function AdminUpdatesPage(props: PageProps<"/admin/content/updates">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const status = str(sp.status);
  const origin = str(sp.origin);
  const page = Math.max(1, Number(str(sp.page) ?? 1));

  const where: Prisma.TechUpdateWhereInput = {
    ...(status === "published" ? { isPublished: true } : status === "draft" ? { isPublished: false } : {}),
    ...(origin === "manual" ? { source: "manual" } : origin === "imported" ? { source: { not: "manual" } } : {}),
  };

  const [posts, total] = await Promise.all([
    db.techUpdate.findMany({
      where,
      orderBy: [{ publishedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      take: PAGE,
      skip: (page - 1) * PAGE,
    }),
    db.techUpdate.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (next: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (origin) params.set("origin", origin);
    if (next > 1) params.set("page", String(next));
    const s = params.toString();
    return s ? `/admin/content/updates?${s}` : "/admin/content/updates";
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Tech updates"
        description={`${total} post${total === 1 ? "" : "s"}. Preview any post to see exactly what students read.`}
        actions={<UpdateEditor />}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSelect
          param="status"
          placeholder="All statuses"
          value={status}
          options={[
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
          ]}
        />
        <FilterSelect
          param="origin"
          placeholder="All sources"
          value={origin}
          options={[
            { value: "manual", label: "Written by us" },
            { value: "imported", label: "Auto-imported" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[46%] min-w-72 pl-5">Title</TableHead>
                <TableHead className="w-[18%] min-w-32">Domains</TableHead>
                <TableHead className="w-[12%] min-w-28">Status</TableHead>
                <TableHead className="w-[12%] min-w-28">Published</TableHead>
                <TableHead className="w-[12%] min-w-32 pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((p) => (
                <TableRow key={p.id} className="align-top">
                  <TableCell className="pl-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={p.title}>
                        {p.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground" title={p.excerpt}>
                        {p.excerpt}
                      </p>
                      {p.sourceName && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">via {p.sourceName}</p>}
                    </div>
                  </TableCell>
                  <TableCell className="truncate text-xs text-muted-foreground" title={p.domainTags.join(", ")}>
                    {p.domainTags.map((t) => getDomain(t)?.short ?? t).join(", ") || "All"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={p.isPublished ? "default" : "secondary"}>{p.isPublished ? "Published" : "Draft"}</Badge>
                      {p.isSample && <Badge variant="outline">Sample</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{day(p.publishedAt)}</TableCell>
                  <TableCell className="pr-5">
                    <div className="flex items-center justify-end">
                      <UpdatePreviewButton post={p} />
                      <UpdateEditor
                        value={{
                          id: p.id,
                          title: p.title,
                          slug: p.slug,
                          excerpt: p.excerpt,
                          body: p.body,
                          domainTags: p.domainTags,
                          readMinutes: p.readMinutes,
                          isPublished: p.isPublished,
                        }}
                      />
                      <DeleteContentButton kind="update" id={p.id} label={p.title} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {posts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No posts match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {pages}
          </span>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" disabled={page === 1}>
              <Link href={qs(page - 1)}>Previous</Link>
            </Button>
            <Button asChild variant="outline" size="sm" disabled={page === pages}>
              <Link href={qs(Math.min(pages, page + 1))}>Next</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
