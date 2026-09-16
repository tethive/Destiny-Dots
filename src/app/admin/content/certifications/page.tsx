import type { Metadata } from "next";
import Link from "next/link";
import { CertResourcePicker } from "@/components/admin/cert-resource-picker";
import { CertEditor, DeleteContentButton } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { difficultyLabel } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Certification guides" };

export default async function AdminCertsPage() {
  await requireAdmin();
  const [certs, paths, library] = await Promise.all([
    db.certificationGuide.findMany({ orderBy: { name: "asc" }, include: { resources: { orderBy: { order: "asc" }, select: { resourceId: true } } } }),
    db.careerPath.findMany({ where: { isPublished: true }, select: { slug: true, title: true }, orderBy: { title: "asc" } }),
    db.resource.findMany({ select: { id: true, title: true, type: true, level: true, isPremium: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Certification guides" description="Guides link to career paths and show up on each path page." actions={<CertEditor paths={paths} />} />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Guide</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="text-right">Linked paths</TableHead>
                <TableHead className="text-right">Resources</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {certs.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-5">
                    <Link href={`/certifications/${c.slug}`} target="_blank" className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{c.provider}</p>
                  </TableCell>
                  <TableCell className="text-sm">{difficultyLabel[c.difficulty]}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.pathSlugs.length}</TableCell>
                  <TableCell className="text-right">
                    <CertResourcePicker certId={c.id} certName={c.name} selectedIds={c.resources.map((r) => r.resourceId)} library={library} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={c.isPublished ? "default" : "secondary"}>{c.isPublished ? "Published" : "Hidden"}</Badge>
                    {c.isSample && (
                      <Badge variant="outline" className="ml-1">
                        Sample
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right whitespace-nowrap">
                    <CertEditor
                      paths={paths}
                      value={{
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        provider: c.provider,
                        domainTags: c.domainTags,
                        overview: c.overview,
                        examFormat: c.examFormat,
                        difficulty: c.difficulty,
                        prepTime: c.prepTime,
                        officialUrl: c.officialUrl,
                        topics: c.topics.join("\n"),
                        pathSlugs: c.pathSlugs,
                        isPublished: c.isPublished,
                      }}
                    />
                    <DeleteContentButton kind="cert" id={c.id} label={c.name} />
                  </TableCell>
                </TableRow>
              ))}
              {certs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No guides yet.
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
