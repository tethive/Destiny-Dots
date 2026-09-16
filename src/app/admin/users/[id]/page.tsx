import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GrantAccessForm, RevokeButton, UserModeration } from "@/components/admin/user-actions";
import { StatCard } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { goalLabels, stageLabels, weeklyLabels } from "@/lib/labels";
import { formatINR } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "User" };

const fmt = (d: Date | null | undefined) => (d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function AdminUserPage(props: PageProps<"/admin/users/[id]">) {
  const admin = await requireAdmin();
  const { id } = await props.params;
  const user = await db.user.findUnique({
    where: { id },
    include: {
      profile: true,
      accounts: { select: { providerId: true } },
      enrollments: { include: { path: { select: { title: true, slug: true, _count: { select: { dots: true } } } } }, orderBy: { lastActivityAt: "desc" } },
      entitlements: { orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      subscriptions: { orderBy: { createdAt: "desc" }, include: { plan: true }, take: 5 },
      _count: { select: { progress: true, bookmarks: true, quizAttempts: true } },
    },
  });
  if (!user) notFound();

  const [progressByPath, paths, dots] = await Promise.all([
    db.progress.groupBy({ by: ["dotId"], where: { userId: id } }).then(async (rows) => {
      const dotRows = await db.dot.findMany({ where: { id: { in: rows.map((r) => r.dotId) } }, select: { pathId: true } });
      return dotRows.reduce<Record<string, number>>((m, d) => ((m[d.pathId] = (m[d.pathId] ?? 0) + 1), m), {});
    }),
    db.careerPath.findMany({ where: { isPublished: true }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    db.dot.findMany({
      where: { id: { in: user.entitlements.filter((e) => e.scope === "DOT").map((e) => e.scopeId!) } },
      select: { id: true, order: true, title: true, path: { select: { title: true } } },
    }),
  ]);
  const pathTitle = new Map(paths.map((p) => [p.id, p.title]));
  const now = new Date();

  const describe = (e: (typeof user.entitlements)[number]) =>
    e.scope === "PLAN"
      ? "Pro (all content)"
      : e.scope === "PATH"
        ? `Path: ${pathTitle.get(e.scopeId!) ?? e.scopeId}`
        : (() => {
            const d = dots.find((x) => x.id === e.scopeId);
            return d ? `Dot ${d.order}: ${d.title} (${d.path.title})` : "Dot";
          })();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All users
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
            {user.role === "admin" && <Badge variant="secondary">Admin</Badge>}
            {user.banned && <Badge variant="destructive">Suspended</Badge>}
          </div>
          <p className="text-muted-foreground">{user.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Joined {fmt(user.createdAt)} · last active {fmt(user.lastActiveAt)} · signs in with {user.accounts.map((a) => (a.providerId === "credential" ? "email" : a.providerId)).join(", ")}
          </p>
        </div>
        <UserModeration userId={user.id} role={user.role ?? "student"} banned={Boolean(user.banned)} isSelf={user.id === admin.id} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Enrolled paths" value={user.enrollments.length} />
        <StatCard label="Dots completed" value={user._count.progress} />
        <StatCard label="Quiz attempts" value={user._count.quizAttempts} />
        <StatCard label="Bookmarks" value={user._count.bookmarks} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card shadow-xs">
            <h2 className="p-5 pb-2 font-semibold">Access</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Entitlement</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead className="pr-5 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.entitlements.map((e) => {
                  const active = !e.revokedAt && (!e.validUntil || e.validUntil > now);
                  return (
                    <TableRow key={e.id} className={active ? "" : "opacity-60"}>
                      <TableCell className="pl-5">
                        {describe(e)}
                        {e.note && <span className="block text-xs text-muted-foreground">{e.note}</span>}
                      </TableCell>
                      <TableCell className="text-xs capitalize">{e.source.toLowerCase().replace("_", " ")}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.revokedAt ? `Revoked ${fmt(e.revokedAt)}` : e.validUntil ? fmt(e.validUntil) : "Forever"}</TableCell>
                      <TableCell className="pr-5 text-right">{active && <RevokeButton entitlementId={e.id} />}</TableCell>
                    </TableRow>
                  );
                })}
                {user.entitlements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 pl-5 text-muted-foreground">
                      Free plan — no unlocks.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Enrolled paths</h2>
            <ul className="mt-3 space-y-2">
              {user.enrollments.map((e) => {
                const done = progressByPath[e.pathId] ?? 0;
                const total = e.path._count.dots;
                return (
                  <li key={e.pathId} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/admin/paths/${e.pathId}`} className="font-medium hover:underline">
                        {e.path.title}
                      </Link>
                      <span className="text-muted-foreground tabular-nums">
                        {done}/{total}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                    </div>
                  </li>
                );
              })}
              {user.enrollments.length === 0 && <li className="text-sm text-muted-foreground">Not enrolled in any path.</li>}
            </ul>
          </section>

          <section className="rounded-2xl border bg-card shadow-xs">
            <h2 className="p-5 pb-2 font-semibold">Orders</h2>
            <Table>
              <TableBody>
                {user.orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-5 whitespace-nowrap">{fmt(o.createdAt)}</TableCell>
                    <TableCell className="text-xs">{o.scope.toLowerCase()} unlock</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(o.amountInr)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <Badge variant={o.status === "PAID" ? "default" : o.status === "FAILED" ? "destructive" : "outline"}>{o.status.toLowerCase()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {user.orders.length === 0 && (
                  <TableRow>
                    <TableCell className="py-6 pl-5 text-muted-foreground">No orders.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Grant access</h2>
            <p className="mt-1 text-sm text-muted-foreground">For scholarships, partners, support fixes or testing.</p>
            <GrantAccessForm userId={user.id} paths={paths} />
          </section>

          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Profile</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Stage", user.profile?.stage ? stageLabels[user.profile.stage] : "—"],
                ["Weekly time", user.profile?.weeklyTime ? weeklyLabels[user.profile.weeklyTime] : "—"],
                ["Goal", user.profile?.goalTimeline ? goalLabels[user.profile.goalTimeline] : "—"],
                ["City", user.profile?.city || "—"],
                ["Interests", user.profile?.domainInterests.map((t) => getDomain(t)?.short ?? t).join(", ") || "—"],
                ["Onboarded", fmt(user.profile?.onboardedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {user.subscriptions.length > 0 && (
            <section className="rounded-2xl border bg-card p-5 shadow-xs">
              <h2 className="font-semibold">Subscriptions</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {user.subscriptions.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2 rounded-xl border p-3">
                    <span>
                      {s.plan.name}
                      {s.isSimulated && <span className="text-xs text-muted-foreground"> (simulated)</span>}
                      <span className="block text-xs text-muted-foreground">until {fmt(s.validUntil)}</span>
                    </span>
                    <Badge variant={s.status === "ACTIVE" ? "default" : "outline"}>{s.status.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
