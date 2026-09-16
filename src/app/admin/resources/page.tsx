import type { Metadata } from "next";
import { Search } from "lucide-react";
import { LinkCheckButton, ResourceRowActions, ResourceSheet } from "@/components/admin/resource-editor";
import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LinkStatus, Prisma, ResourceType } from "@/generated/prisma/client";
import { domains } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Resource library" };

const PAGE = 50;

export default async function AdminResourcesPage(props: PageProps<"/admin/resources">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const q = str(sp.q) ?? "";
  const type = str(sp.type) as ResourceType | undefined;
  const status = str(sp.status) as LinkStatus | undefined;
  const domain = str(sp.domain);
  const sample = str(sp.sample);
  const page = Math.max(1, Number(str(sp.page) ?? 1));

  const where: Prisma.ResourceWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(type ? { type } : {}),
    ...(status ? { linkStatus: status } : {}),
    ...(domain ? { domainTags: { has: domain } } : {}),
    ...(sample ? { isSample: sample === "1" } : {}),
  };
  const [resources, total, broken, samples] = await Promise.all([
    db.resource.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: PAGE,
      skip: (page - 1) * PAGE,
      include: { _count: { select: { dots: true, bookmarks: true, certifications: true } } },
    }),
    db.resource.count({ where }),
    db.resource.count({ where: { linkStatus: "BROKEN" } }),
    db.resource.count({ where: { isSample: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (p: number) => {
    const params = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    params.set("page", String(p));
    return `?${params}`;
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Resource library"
        description={`${total} resources · ${broken} broken links · ${samples} sample placeholders`}
        actions={
          <>
            <LinkCheckButton />
            <ResourceSheet />
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative" action="/admin/resources">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search titles" className="h-9 w-56 rounded-full pl-9" />
        </form>
        <FilterSelect param="domain" placeholder="All domains" value={domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <FilterSelect param="type" placeholder="All types" value={type} options={["VIDEO", "DOC", "PROJECT", "QUIZ", "LINK"].map((t) => ({ value: t, label: t.toLowerCase() }))} />
        <FilterSelect
          param="status"
          placeholder="Any link status"
          value={status}
          options={[
            { value: "OK", label: "OK" },
            { value: "BROKEN", label: "Broken" },
            { value: "UNCHECKED", label: "Unchecked" },
          ]}
        />
        <FilterSelect
          param="sample"
          placeholder="Real & sample"
          value={sample}
          options={[
            { value: "1", label: "Sample only" },
            { value: "0", label: "Real only" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Link</TableHead>
                <TableHead className="text-right">Used in</TableHead>
                <TableHead className="text-right">Saves</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-md pl-5">
                    <p className="truncate font-medium">{r.title}</p>
                    {r.fileName ? (
                      <span className="block truncate text-xs text-muted-foreground">Uploaded file · {r.fileName}</span>
                    ) : (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-muted-foreground hover:underline">
                        {r.url}
                      </a>
                    )}
                    <div className="mt-1 flex gap-1">
                      {r.isPremium && <Badge variant="secondary">Premium</Badge>}
                      {r.isSample && <Badge variant="outline">Sample</Badge>}
                      <Badge variant="outline">{r.level.toLowerCase()}</Badge>
                      {r.embeddable === false && !r.fileKey && <Badge variant="outline">Opens in new tab</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase">{r.type}</TableCell>
                  <TableCell>
                    <Badge variant={r.linkStatus === "BROKEN" ? "destructive" : r.linkStatus === "OK" ? "default" : "outline"}>{r.linkStatus.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r._count.dots} dots{r._count.certifications ? ` · ${r._count.certifications} certs` : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r._count.bookmarks}</TableCell>
                  <TableCell className="pr-5 text-right">
                    <ResourceRowActions
                      resource={{
                        id: r.id,
                        title: r.title,
                        url: r.url,
                        type: r.type,
                        level: r.level,
                        file: r.fileKey && r.fileName && r.fileMime ? { key: r.fileKey, name: r.fileName, mime: r.fileMime } : null,
                        duration: r.duration ?? "",
                        isPremium: r.isPremium,
                        domainTags: r.domainTags,
                        topics: r.topics.join(", "),
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {resources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No resources match.
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
            {page > 1 && (
              <a className="rounded-full border px-3 py-1 hover:bg-muted" href={qs(page - 1)}>
                Previous
              </a>
            )}
            {page < pages && (
              <a className="rounded-full border px-3 py-1 hover:bg-muted" href={qs(page + 1)}>
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
