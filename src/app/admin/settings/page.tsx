import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { BusinessForm } from "@/components/admin/business-form";
import { PricingForm, PurgeSamplesButton } from "@/components/admin/settings-actions";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { env, features } from "@/lib/env";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { simulatorEnabled } from "@/server/payments";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Admin settings" };

const fmt = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [business, plans, prices, admins, logs, sampleUpdates, sampleJobs, sampleCerts, sampleResources] = await Promise.all([
    getSetting("business"),
    db.plan.findMany(),
    db.price.findMany({ where: { scopeId: null } }),
    db.user.findMany({ where: { role: "admin" }, select: { id: true, name: true, email: true } }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { actor: { select: { name: true } } } }),
    db.techUpdate.count({ where: { isSample: true } }),
    db.jobListing.count({ where: { isSample: true } }),
    db.certificationGuide.count({ where: { isSample: true } }),
    db.resource.count({ where: { isSample: true } }),
  ]);

  const pricing = {
    monthly: plans.find((p) => p.interval === "MONTHLY")?.priceInr ?? 299,
    yearly: plans.find((p) => p.interval === "YEARLY")?.priceInr ?? 1999,
    dot: prices.find((p) => p.scope === "DOT")?.amountInr ?? 149,
    path: prices.find((p) => p.scope === "PATH")?.amountInr ?? 599,
  };

  const integrations = [
    { name: "Database", ok: !env.DATABASE_URL.includes("localhost"), detail: env.DATABASE_URL.includes("localhost") ? "Local Prisma Postgres (development)" : "Cloud Postgres" },
    { name: "Razorpay payments", ok: features.razorpay, detail: features.razorpay ? (env.RAZORPAY_KEY_ID?.startsWith("rzp_live") ? "Live keys" : "Test keys") : simulatorEnabled ? "Local payment simulator" : "Add RAZORPAY_KEY_ID / SECRET" },
    { name: "Razorpay webhook", ok: Boolean(env.RAZORPAY_WEBHOOK_SECRET), detail: env.RAZORPAY_WEBHOOK_SECRET ? "Secret set" : "Add RAZORPAY_WEBHOOK_SECRET" },
    { name: "Email (Resend)", ok: features.email, detail: features.email ? `Sending as ${env.EMAIL_FROM ?? "onboarding@resend.dev"}` : "Emails print to the server console" },
    { name: "Google sign-in", ok: features.google, detail: features.google ? "Enabled" : "Add GOOGLE_CLIENT_ID / SECRET" },
    { name: "Bot protection (Turnstile)", ok: features.turnstile, detail: features.turnstile ? "Enabled on sign-up, login, reset & contact" : "Add Turnstile keys" },
    { name: "File storage (R2 / S3)", ok: features.objectStorage, detail: features.objectStorage ? "Bucket configured" : "Local .storage folder (development)" },
    { name: "Encryption key", ok: Boolean(env.ENCRYPTION_KEY), detail: env.ENCRYPTION_KEY ? "Set" : "Development fallback key" },
    { name: "Scheduled jobs", ok: Boolean(env.CRON_SECRET), detail: env.CRON_SECRET ? "CRON_SECRET set" : "Add CRON_SECRET" },
    { name: "Job imports", ok: features.adzuna || features.jooble, detail: [features.adzuna && "Adzuna", features.jooble && "Jooble"].filter(Boolean).join(" + ") || "Remotive only — add Adzuna / Jooble keys" },
  ];
  const sampleTotal = sampleUpdates + sampleJobs + sampleCerts;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Settings" description="Pricing, integrations and housekeeping." />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Pricing</h2>
          <PricingForm initial={pricing} />
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Integrations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Secrets live in the server environment and are never shown here.</p>
          <ul className="mt-4 divide-y">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex shrink-0 items-center gap-2 font-medium whitespace-nowrap">
                  {i.ok ? <CheckCircle2 className="size-4 text-primary" /> : <CircleDashed className="size-4 text-muted-foreground" />}
                  {i.name}
                </span>
                <span className="text-right text-xs text-muted-foreground">{i.detail}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Webhook URL: <code className="rounded bg-muted px-1 py-0.5">{`${process.env.BETTER_AUTH_URL ?? ""}/api/webhooks/razorpay`}</code>
          </p>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Business details</h2>
          <p className="mt-1 text-sm text-muted-foreground">Printed on every invoice.</p>
          <BusinessForm initial={business} />
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Sample content</h2>
          <p className="mt-1 text-sm text-muted-foreground">Development placeholders that must be replaced before launch.</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ["Updates", sampleUpdates],
              ["Jobs", sampleJobs],
              ["Cert guides", sampleCerts],
              ["Resources", sampleResources],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border p-3">
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="text-xl font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <PurgeSamplesButton count={sampleTotal} />
            {sampleResources > 0 && (
              <Link href="/admin/resources?sample=1" className="text-sm text-primary hover:underline">
                Replace sample resources
              </Link>
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sample resources stay attached to dots until you swap them for real links in the resource library.</p>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="font-semibold">Admins</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Emails in <code className="rounded bg-muted px-1 py-0.5">ADMIN_EMAILS</code> become admins on sign-up. You can also promote a user from their profile.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
                <Link href={`/admin/users/${a.id}`} className="font-medium hover:underline">
                  {a.name}
                </Link>
                <span className="truncate text-muted-foreground">{a.email}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border bg-card shadow-xs">
        <h2 className="p-5 pb-3 font-semibold">Audit log</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="pr-5">Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{fmt(l.createdAt)}</TableCell>
                  <TableCell>{l.actor.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {l.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-72 truncate pr-5 text-xs text-muted-foreground">
                    {l.targetType}
                    {l.meta && typeof l.meta === "object" && !Array.isArray(l.meta)
                      ? ` · ${Object.entries(l.meta)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(", ")}`
                      : ""}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No admin actions recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
