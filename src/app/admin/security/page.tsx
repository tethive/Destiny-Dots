import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { RevokeSessionButton } from "@/components/admin/security-actions";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireEmailVerification } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, features, isProduction } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { daysAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Security" };

const when = (d: Date) => d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const sensitive = ["payout.details.view", "user.role", "user.ban", "users.export", "order.refund", "access.grant", "access.revoke", "settings.business", "settings.marketplace", "pricing.update", "payout.paid", "payout.create", "dispute.resolve", "session.revoke", "user.ban", "user.unban"];

export default async function SecurityPage() {
  await requireAdmin();
  const dayAgo = daysAgo(1);
  const [adminSessions, events, banned, limited, unverified] = await Promise.all([
    db.session.findMany({
      where: { user: { role: "admin" }, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
      take: 50,
    }),
    db.auditLog.findMany({ where: { action: { in: sensitive } }, orderBy: { createdAt: "desc" }, take: 40, include: { actor: { select: { name: true } } } }),
    db.user.count({ where: { banned: true } }),
    db.rateLimit.count({ where: { lastRequest: { gt: BigInt(dayAgo.getTime()) }, count: { gt: 5 } } }),
    db.user.count({ where: { emailVerified: false } }),
  ]);

  const checks = [
    { label: "SQL injection", ok: true, detail: "All queries go through Prisma's parameterised client; the one raw query uses tagged-template parameters." },
    { label: "Cross-site scripting (XSS)", ok: true, detail: "React escapes output, Markdown renders without raw HTML, and a per-request nonce CSP blocks injected scripts." },
    { label: "CSRF", ok: true, detail: "Server actions check the Origin header; Better Auth only trusts the site's own origins." },
    { label: "Clickjacking", ok: true, detail: "frame-ancestors 'none' and X-Frame-Options: DENY." },
    { label: "HTTPS & HSTS", ok: isProduction ? env.BETTER_AUTH_URL.startsWith("https://") : true, detail: "Strict-Transport-Security with preload; secure cookies in production." },
    { label: "Brute-force protection", ok: true, detail: "Database-backed rate limits on sign-in (5/min), sign-up, reset, contact and uploads." },
    { label: "Bot protection", ok: features.turnstile, detail: features.turnstile ? "Cloudflare Turnstile on public forms." : "Add Turnstile keys to enable." },
    { label: "Breached passwords", ok: true, detail: "Passwords found in Have I Been Pwned are rejected (k-anonymity check)." },
    { label: "Email verification", ok: requireEmailVerification, detail: requireEmailVerification ? "Required before password sign-in." : "Off until email sending is configured." },
    { label: "Payments", ok: Boolean(env.RAZORPAY_WEBHOOK_SECRET) || !features.razorpay, detail: "Access is granted only by HMAC-verified, de-duplicated Razorpay webhooks." },
    { label: "Private files", ok: true, detail: "Stored privately; served only after an access check, sandboxed, with type sniffing on upload." },
    { label: "Sensitive data at rest", ok: Boolean(env.ENCRYPTION_KEY) || !isProduction, detail: "Seller bank/UPI details encrypted with AES-256-GCM; payout detail views are audit-logged." },
    { label: "SSRF", ok: true, detail: "Link checks and RSS fetches resolve DNS and block private networks on every redirect." },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Security" description="How the platform is protected, who has admin access right now, and recent sensitive actions." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active admin sessions" value={adminSessions.length} icon={ShieldCheck} />
        <StatCard label="Suspended users" value={banned} />
        <StatCard label="Rate-limited keys (24h)" value={limited} />
        <StatCard label="Unverified accounts" value={unverified} />
      </div>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Protections</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {checks.map((c) => (
            <li key={c.label} className="flex gap-3 rounded-xl border p-3 text-sm">
              {c.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />}
              <span>
                <span className="font-medium">{c.label}</span>
                <span className="block text-muted-foreground">{c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border bg-card shadow-xs">
        <h2 className="p-5 pb-3 font-semibold">Admin sessions</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Admin</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminSessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="pl-5">
                    {s.user.name}
                    <span className="block text-xs text-muted-foreground">{s.user.email}</span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs text-muted-foreground">{s.userAgent ?? "Unknown"}</TableCell>
                  <TableCell className="font-mono text-xs">{s.ipAddress ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{when(s.updatedAt)}</TableCell>
                  <TableCell className="pr-5 text-right"><RevokeSessionButton sessionId={s.id} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-2xl border bg-card shadow-xs">
        <h2 className="p-5 pb-3 font-semibold">Sensitive actions</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="pl-5 whitespace-nowrap text-muted-foreground">{when(e.createdAt)}</TableCell>
                  <TableCell>{e.actor.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 font-mono text-xs text-muted-foreground">{e.targetId ?? ""}</TableCell>
                </TableRow>
              ))}
              {events.length === 0 && (
                <TableRow>
                  <TableCell className="py-8 text-center text-muted-foreground">No sensitive actions recorded yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
