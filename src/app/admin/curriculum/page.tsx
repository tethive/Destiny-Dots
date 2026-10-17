import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CsvImport } from "@/components/admin/topic-curator";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/session";
import { curationStats, moduleOverview } from "@/server/curriculum";

export const metadata: Metadata = { title: "Curriculum curation" };

export default async function CurriculumPage() {
  await requireAdmin();
  const [modules, stats] = await Promise.all([moduleOverview(), curationStats()]);
  const topics = modules.reduce((n, m) => n + m.topics, 0);
  const covered = modules.reduce((n, m) => n + m.covered, 0);
  const sharedDots = modules.reduce((n, m) => n + m.dots, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Curriculum curation"
        description={`${covered} of ${topics} shared topics curated · they fill ${sharedDots} of ${stats.total} dots · ${stats.withResources} dots have resources`}
      />

      <div className="rounded-2xl border bg-card">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Shared modules</h2>
          <p className="text-sm text-muted-foreground">Curate a topic once and it lands in every path that teaches it.</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Module</TableHead>
              <TableHead className="text-right">Topics</TableHead>
              <TableHead className="text-right">Curated</TableHead>
              <TableHead className="text-right">Paths</TableHead>
              <TableHead className="text-right">Dots filled</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((m) => {
              const done = m.covered === m.topics;
              return (
                <TableRow key={m.code}>
                  <TableCell>
                    <Link href={`/admin/curriculum/${m.code}`} className="font-medium hover:underline">
                      <span className="font-mono text-xs text-muted-foreground">{m.code}</span> {m.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.topics}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={done ? "secondary" : m.covered ? "outline" : "outline"} className={done ? "" : "text-muted-foreground"}>
                      {m.covered}/{m.topics}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.paths}</TableCell>
                  <TableCell className="text-right tabular-nums">{m.dots}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/curriculum/${m.code}`} aria-label={`Curate ${m.name}`}>
                      <ArrowRight className="size-4 text-muted-foreground" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CsvImport />

      <p className="text-sm text-muted-foreground">
        Topics that belong to a single path are curated from{" "}
        <Link href="/admin/paths" className="underline">
          Paths &amp; dots
        </Link>
        , or through the bulk import above using their own keys (e.g. <span className="font-mono text-xs">CY1.U07</span>).
      </p>
    </div>
  );
}
