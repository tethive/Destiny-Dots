import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, BadgeIndianRupee, Sparkles, UserPlus, Users } from "lucide-react";
import { TopPathsChart, TrendChart } from "@/components/admin/charts";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { formatINR } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { getDropOffMatrix, getOverview } from "@/server/admin-stats";
import { getUsageSummary, usageAlerts } from "@/server/usage";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [o, matrix, usage] = await Promise.all([getOverview(), getDropOffMatrix(6), getUsageSummary()]);
  const alerts = usageAlerts(usage.providers, usage.alertPct);
  const steps = ["bg-muted", "bg-primary/20", "bg-primary/40", "bg-primary/65", "bg-primary"];
  const level = (r: number) => (r <= 0 ? 0 : r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Overview" description="Signups, subscribers, revenue and where students drop off." />

      {alerts.length > 0 && (
        <Link
          href="/admin/usage"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm hover:bg-amber-500/15"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>
            <span className="font-medium">Some services are near their limits</span>
            <span className="block text-muted-foreground">
              {alerts.map((a) => `${a.provider} · ${a.label} (${a.period}): ${a.pct}%`).join(" · ")}
            </span>
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Students" value={o.users.toLocaleString("en-IN")} icon={Users} />
        <StatCard label="Signups (7 / 30 days)" value={`${o.signups7} / ${o.signups30}`} icon={UserPlus} />
        <StatCard label="Active learners (7d)" value={o.activeLearners7} icon={Activity} />
        <StatCard label="Active subscribers" value={o.activeSubscribers} hint={`MRR ${formatINR(o.mrr)}`} icon={Sparkles} />
        <StatCard label="One-off revenue" value={formatINR(o.oneOffRevenue)} hint={`${o.paidOrders} paid orders`} icon={BadgeIndianRupee} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Signups</h2>
          <p className="text-sm text-muted-foreground">New student accounts per day, last 30 days</p>
          <div className="mt-4">
            <TrendChart data={o.series} dataKey="signups" label="Signups" />
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">One-off revenue</h2>
          <p className="text-sm text-muted-foreground">Paid dot & path unlocks per day (INR), last 30 days</p>
          <div className="mt-4">
            <TrendChart data={o.series} dataKey="revenue" label="Revenue" format="inr" />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Top paths by enrolment</h2>
          {o.topPaths.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No enrolments yet.</p>
          ) : (
            <div className="mt-4">
              <TopPathsChart data={o.topPaths} />
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold">Drop-off heatmap</h2>
              <p className="text-sm text-muted-foreground">Share of enrolled students who completed each dot</p>
            </div>
            <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-hidden>
              0%
              {steps.map((s) => (
                <span key={s} className={cn("size-3 rounded-[3px]", s)} />
              ))}
              100%
            </span>
          </div>
          {matrix.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">No enrolments yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-separate border-spacing-[3px] text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-muted-foreground">Path</th>
                    {Array.from({ length: Math.max(...matrix.map((m) => m.dots.length)) }, (_, i) => (
                      <th key={i} className="w-7 font-mono font-normal text-muted-foreground">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((row) => (
                    <tr key={row.path.id}>
                      <th className="max-w-40 truncate pr-2 text-left font-medium" scope="row">
                        <Link href={`/admin/paths/${row.path.id}`} className="hover:underline">
                          {row.path.title}
                        </Link>
                        <span className="block font-normal text-muted-foreground">{row.enrolled} enrolled</span>
                      </th>
                      {row.dots.map((d) => (
                        <td key={d.order} className="p-0">
                          <span
                            title={`Dot ${d.order}: ${d.title} — ${Math.round(d.rate * 100)}% (${d.completed}/${row.enrolled})`}
                            className={cn("block h-7 rounded-[4px] hover:ring-2 hover:ring-foreground/40", steps[level(d.rate)])}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
