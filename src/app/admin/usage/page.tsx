import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, CircleDashed, ExternalLink, OctagonAlert } from "lucide-react";
import { DailyEmailsChart } from "@/components/admin/charts";
import { SendTestEmailButton, UsageLimitsForm } from "@/components/admin/usage-limits-form";
import { PageHeader } from "@/components/app/page-header";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getUsageSummary, type Meter } from "@/server/usage";

export const metadata: Metadata = { title: "Usage & limits" };

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(2) : v < 100 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

const fmt = (m: Meter, n: number) => (m.unit === "bytes" ? formatBytes(n) : n.toLocaleString("en-IN"));

function MeterRow({ meter, alertPct }: { meter: Meter; alertPct: number }) {
  const pct = meter.limit ? (meter.used / meter.limit) * 100 : null;
  const state = pct === null ? "none" : pct >= 100 ? "over" : pct >= alertPct ? "near" : "ok";
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">
          {meter.label} <span className="font-normal text-muted-foreground">· {meter.period}</span>
        </span>
        <span className="shrink-0 text-right tabular-nums">
          {fmt(meter, meter.used)}
          {meter.limit !== null && <span className="text-muted-foreground"> / {fmt(meter, meter.limit)}</span>}
        </span>
      </div>
      {pct !== null && (
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${meter.label}, ${meter.period}`}
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={cn("h-full rounded-full", state === "over" ? "bg-destructive" : state === "near" ? "bg-amber-500" : "bg-primary")}
            style={{
              width: `${Math.min(100, pct > 0 ? Math.max(pct, 1.5) : 0)}%`,
            }}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{meter.hint}</span>
        {state === "over" && (
          <span className="flex shrink-0 items-center gap-1 font-medium text-destructive">
            <OctagonAlert className="size-3.5" /> Over limit · {Math.round(pct!)}%
          </span>
        )}
        {state === "near" && (
          <span className="flex shrink-0 items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-3.5" /> Near limit · {Math.round(pct!)}%
          </span>
        )}
        {state === "ok" && <span className="shrink-0 tabular-nums">{pct! > 0 && pct! < 1 ? "<1" : Math.round(pct!)}% used</span>}
        {state === "none" && <span className="shrink-0">No fixed limit</span>}
      </div>
    </li>
  );
}

export default async function AdminUsagePage() {
  await requireAdmin();
  const { providers, emailSeries, alertPct, limits } = await getUsageSummary();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Usage & limits"
        description="How much of each service the app has used, compared with your plan limits. Counting starts from this release, so earlier activity isn't included."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {providers.map((p) => (
          <section key={p.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  {p.configured ? <CheckCircle2 className="size-3.5 text-primary" /> : <CircleDashed className="size-3.5" />}
                  {p.configured ? "Connected" : "Not configured yet"}
                </p>
              </div>
              <a
                href={p.dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted"
              >
                Dashboard <ExternalLink className="size-3" />
              </a>
            </div>
            <ul className="mt-2 divide-y">
              {p.meters.map((m) => (
                <MeterRow key={`${m.label}-${m.period}`} meter={m} alertPct={alertPct} />
              ))}
            </ul>
            {p.id === "resend" && p.configured && <SendTestEmailButton />}
            {p.note && <p className="mt-auto pt-2 text-xs text-muted-foreground">{p.note}</p>}
          </section>
        ))}
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Emails sent per day</h2>
          <p className="text-sm text-muted-foreground">Sent by the app · last 30 days · daily limit {limits.resendDaily.toLocaleString("en-IN")}</p>
          <div className="mt-4">
            <DailyEmailsChart data={emailSeries} limit={limits.resendDaily} />
          </div>
        </section>
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Limits</h2>
          <p className="mt-1 text-sm text-muted-foreground">When a meter reaches the warning level, the admin inbox gets one email that day.</p>
          <UsageLimitsForm initial={limits} />
        </section>
      </div>
    </div>
  );
}
