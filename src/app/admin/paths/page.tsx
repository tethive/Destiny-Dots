import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { FilterSelect } from "@/components/app/filter-select";
import { PageHeader } from "@/components/app/page-header";
import { DomainBadge } from "@/components/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Prisma } from "@/generated/prisma/client";
import { domains, getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Paths & dots" };

export default async function AdminPathsPage(props: PageProps<"/admin/paths">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const domain = typeof sp.domain === "string" ? sp.domain : undefined;
  const status = typeof sp.status === "string" ? sp.status : undefined;

  const where: Prisma.CareerPathWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(domain ? { domainTag: domain } : {}),
    ...(status ? { isPublished: status === "published" } : {}),
  };
  const paths = await db.careerPath.findMany({
    where,
    orderBy: [{ domainTag: "asc" }, { title: "asc" }],
    include: { _count: { select: { dots: true, enrollments: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Paths & dots"
        description="Create career paths, arrange their dots and publish when they're ready."
        actions={
          <Button asChild size="lg" className="rounded-full">
            <Link href="/admin/paths/new">
              <Plus /> New path
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="relative" action="/admin/paths">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Search paths" className="h-9 w-56 rounded-full pl-9" />
        </form>
        <FilterSelect param="domain" placeholder="All domains" value={domain} options={domains.map((d) => ({ value: d.tag, label: d.name }))} />
        <FilterSelect
          param="status"
          placeholder="Any status"
          value={status}
          options={[
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Path</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead className="text-right">Dots</TableHead>
                <TableHead className="text-right">Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5 text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paths.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="pl-5">
                    <Link href={`/admin/paths/${p.id}`} className="font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">/{p.slug}</p>
                  </TableCell>
                  <TableCell>
                    <DomainBadge tag={p.domainTag as DomainTag} label={getDomain(p.domainTag)?.short ?? p.domainTag} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p._count.dots}</TableCell>
                  <TableCell className="text-right tabular-nums">{p._count.enrollments}</TableCell>
                  <TableCell>
                    <Badge variant={p.isPublished ? "default" : "secondary"}>{p.isPublished ? "Published" : "Draft"}</Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right whitespace-nowrap text-muted-foreground">
                    {p.updatedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </TableCell>
                </TableRow>
              ))}
              {paths.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No paths match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
