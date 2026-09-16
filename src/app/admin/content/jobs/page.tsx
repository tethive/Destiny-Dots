import type { Metadata } from "next";
import { DeleteContentButton, JobEditor } from "@/components/admin/content-editors";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { db } from "@/lib/db";
import { levelLabels, workModeLabels } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Job listings" };

// yyyy-mm-dd in IST, for <input type="date">
const dateInput = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10) : "");

export default async function AdminJobsPage() {
  await requireAdmin();
  const [jobs, paths] = await Promise.all([
    db.jobListing.findMany({ orderBy: { postedAt: "desc" }, include: { _count: { select: { saves: true } } } }),
    db.careerPath.findMany({ where: { isPublished: true }, select: { slug: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const now = new Date();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Job listings" description="Curated openings. Refresh weekly so students always see live roles." actions={<JobEditor paths={paths} />} />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Role</TableHead>
                <TableHead>Where</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Saves</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((j) => {
                const expired = Boolean(j.expiresAt && j.expiresAt < now);
                return (
                  <TableRow key={j.id}>
                    <TableCell className="pl-5">
                      <a href={j.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                        {j.title}
                      </a>
                      <p className="text-xs text-muted-foreground">{j.company}</p>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {j.location} · {workModeLabels[j.workMode]}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">{levelLabels[j.level]}</TableCell>
                    <TableCell className="text-right tabular-nums">{j._count.saves}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={expired ? "destructive" : j.isPublished ? "default" : "secondary"}>{expired ? "Expired" : j.isPublished ? "Live" : "Hidden"}</Badge>
                      {j.isSample && (
                        <Badge variant="outline" className="ml-1">
                          Sample
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right whitespace-nowrap">
                      <JobEditor
                        paths={paths}
                        value={{
                          id: j.id,
                          title: j.title,
                          company: j.company,
                          location: j.location,
                          workMode: j.workMode,
                          level: j.level,
                          domainTags: j.domainTags,
                          pathSlugs: j.pathSlugs,
                          url: j.url,
                          salary: j.salary ?? "",
                          description: j.description ?? "",
                          expiresAt: dateInput(j.expiresAt),
                          isPublished: j.isPublished,
                        }}
                      />
                      <DeleteContentButton kind="job" id={j.id} label={j.title} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No job listings yet.
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
