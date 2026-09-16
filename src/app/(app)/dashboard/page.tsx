import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Briefcase, CheckCircle2, Compass, Flame, Newspaper, Route, Sparkles, Store, Trophy } from "lucide-react";
import { ActivityHeatmap } from "@/components/app/activity-heatmap";
import { TiltCard } from "@/components/motion/tilt-card";
import { AnimatedRing, CountUp, Rise, RiseGroup, RiseInView } from "@/components/app/dashboard-motion";
import { EmptyState, StatCard } from "@/components/app/page-header";
import { DomainBadge, DomainIcon, domainTheme, domainVars } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { getDomain, type DomainTag } from "@/lib/catalog";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { enrolAndStart } from "@/server/actions/student";
import { getAccess } from "@/server/access";
import { getAchievements, getActivity, getCompletedDotIds, getMyPaths, getRecommendations } from "@/server/learning";

export const metadata: Metadata = { title: "Dashboard" };

/** Greeting based on the current hour in India. */
function greetingForNow() {
  const hour = new Date(Date.now() + 330 * 60_000).getUTCHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [myPaths, completed, activity, achievements, recs, access, profile, updates, jobs] = await Promise.all([
    getMyPaths(user.id),
    getCompletedDotIds(user.id),
    getActivity(user.id),
    getAchievements(user.id),
    getRecommendations(user.id, 3),
    getAccess(user.id),
    db.profile.findUnique({ where: { userId: user.id } }),
    db.techUpdate.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
    db.jobListing.findMany({ where: { isPublished: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, orderBy: { postedAt: "desc" }, take: 12 }),
  ]);

  const interests = new Set(profile?.domainInterests ?? []);
  const relevantJobs = jobs
    .sort((a, b) => Number(b.domainTags.some((t) => interests.has(t))) - Number(a.domainTags.some((t) => interests.has(t))))
    .slice(0, 3);
  const continuing = myPaths.find((p) => p.nextDot) ?? null;
  const unlocked = achievements.filter((a) => a.unlocked);
  const greeting = greetingForNow();

  return (
    <RiseGroup className="mx-auto max-w-6xl space-y-8">
      <Rise className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            <span className="text-brand-gradient">{user.name.split(" ")[0]}</span>{" "}
            <span className="inline-block origin-[70%_70%] animate-wave">👋</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 font-medium shadow-xs">
            <Flame className={activity.streak > 0 ? "size-4 animate-flicker text-orange-500" : "size-4 text-muted-foreground"} />
            <CountUp value={activity.streak} suffix="-day streak" duration={1} />
          </span>
          {access.plan && (
            <span className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full bg-primary/10 px-3 py-1.5 font-medium text-primary">
              <Sparkles className="size-4" /> Pro
              <span className="absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-linear-to-r from-transparent via-white/40 to-transparent" aria-hidden />
            </span>
          )}
        </div>
      </Rise>

      {/* Continue learning */}
      <Rise>
        {continuing ? (
          <ContinueCard p={continuing} />
        ) : myPaths.length > 0 ? (
          <div className="rounded-2xl border bg-card p-6 shadow-xs">
            <p className="font-semibold">You&apos;ve completed every dot in your paths 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">Pick your next path to keep the streak going.</p>
            <Button asChild className="mt-4 rounded-full" size="lg">
              <Link href="/explore">Explore paths</Link>
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={Route}
            title="Start your first path"
            description="Enrol in a path to see your next dot here. The first dots of every path are free."
            action={
              <Button asChild className="rounded-full" size="lg">
                <Link href="/explore">Explore paths</Link>
              </Button>
            }
          />
        )}
      </Rise>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Rise hover>
          <StatCard label="Dots completed" value={<CountUp value={completed.size} />} icon={CheckCircle2} />
        </Rise>
        <Rise hover>
          <StatCard label="Active paths" value={<CountUp value={myPaths.filter((p) => p.done < p.total).length} />} icon={Route} />
        </Rise>
        <Rise hover>
          <StatCard label="Current streak" value={<CountUp value={activity.streak} suffix="d" />} hint={`Longest: ${activity.longest} days`} icon={Flame} />
        </Rise>
        <Rise hover>
          <StatCard
            label="Achievements"
            value={
              <>
                <CountUp value={unlocked.length} />
                <span className="text-muted-foreground">/{achievements.length}</span>
              </>
            }
            icon={Trophy}
          />
        </Rise>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Active paths */}
        <Rise>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">My active paths</h2>
              <Link href="/my-paths" className="text-sm text-muted-foreground hover:text-foreground">
                View all
              </Link>
            </div>
            {myPaths.length === 0 ? (
              <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">No paths yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {myPaths.slice(0, 4).map((p, i) => {
                  const domain = getDomain(p.path.domainTag)!;
                  return (
                    <Link
                      key={p.path.id}
                      href={`/learn/${p.path.slug}`}
                      style={domainVars(p.path.domainTag as DomainTag)}
                      className="group flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-[color-mix(in_oklch,var(--d)_40%,var(--border))] hover:shadow-lg"
                    >
                      <AnimatedRing value={p.percent} size={64} stroke={6} barClassName="stroke-[var(--d)]" label={`${p.percent}%`} delay={0.3 + i * 0.12} />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{domain.short}</p>
                        <p className="truncate font-semibold">{p.path.title}</p>
                        <p className="text-sm text-muted-foreground">{p.nextDot ? `Dot ${p.nextDot.order} of ${p.total}` : "Completed"}</p>
                      </div>
                      <ArrowRight className="ml-auto size-4 shrink-0 -translate-x-2 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </Rise>

        {/* Activity */}
        <Rise>
          <section className="h-full rounded-2xl border bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Activity</h2>
              <Link href="/achievements" className="text-sm text-muted-foreground hover:text-foreground">
                Achievements
              </Link>
            </div>
            <ActivityHeatmap days={activity.days} animated />
            {unlocked.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {unlocked.slice(-4).map((a, i) => (
                  <span
                    key={a.id}
                    style={{ animationDelay: `${900 + i * 120}ms` }}
                    className="inline-flex animate-pop items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium"
                  >
                    <a.icon className="size-3.5 text-primary" /> {a.title}
                  </span>
                ))}
              </div>
            )}
          </section>
        </Rise>
      </div>

      {/* Recommendations */}
      {recs.length > 0 && (
        <RiseInView>
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="size-4 text-primary" /> Recommended for you
              </h2>
              <Link href="/settings" className="text-sm text-muted-foreground hover:text-foreground">
                Update interests
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {recs.map(({ path, reason }, i) => {
                const domain = getDomain(path.domainTag)!;
                return (
                  <RiseInView key={path.id} delay={i * 0.1} className="h-full">
                    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
                      <div
                        className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-30"
                        style={{ background: domainTheme[path.domainTag as DomainTag]?.hex }}
                        aria-hidden
                      />
                      <DomainBadge tag={path.domainTag as DomainTag} label={domain.short} className="w-fit" />
                      <p className="mt-3 font-semibold">{path.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{path.summary}</p>
                      <p className="mt-3 text-xs text-primary">{reason}</p>
                      <div className="mt-auto flex gap-2 pt-4">
                        <form action={enrolAndStart.bind(null, path.id)} className="flex-1">
                          <Button type="submit" size="lg" className="w-full rounded-full">
                            Start
                          </Button>
                        </form>
                        <Button asChild size="lg" variant="outline" className="rounded-full">
                          <Link href={`/learn/${path.slug}`}>Preview</Link>
                        </Button>
                      </div>
                    </div>
                  </RiseInView>
                );
              })}
            </div>
          </section>
        </RiseInView>
      )}

      {/* Career feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RiseInView>
          <FeedCard title="Latest tech updates" href="/updates" icon={Newspaper}>
            {updates.map((u) => (
              <Link key={u.id} href={`/updates/${u.slug}`} className="block rounded-xl p-3 transition-all hover:translate-x-1 hover:bg-muted">
                <p className="line-clamp-1 font-medium">{u.title}</p>
                <p className="line-clamp-1 text-sm text-muted-foreground">{u.excerpt}</p>
              </Link>
            ))}
            {updates.length === 0 && <p className="p-3 text-sm text-muted-foreground">No updates yet.</p>}
          </FeedCard>
        </RiseInView>
        <RiseInView delay={0.1}>
          <FeedCard title="Jobs for you" href="/jobs" icon={Briefcase}>
            {relevantJobs.map((j) => (
              <Link key={j.id} href="/jobs" className="flex items-center gap-3 rounded-xl p-3 transition-all hover:translate-x-1 hover:bg-muted">
                {j.domainTags[0] && <DomainIcon tag={j.domainTags[0] as DomainTag} className="size-9 [&_svg]:size-4" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{j.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {j.company} · {j.location}
                  </span>
                </span>
              </Link>
            ))}
            {relevantJobs.length === 0 && <p className="p-3 text-sm text-muted-foreground">No openings right now.</p>}
          </FeedCard>
        </RiseInView>
      </div>

      <RiseInView className="flex flex-wrap gap-3 text-sm">
        <QuickLink href="/certifications" icon={Award} label="Certification guides" />
        <QuickLink href="/resume" icon={Compass} label="Build your resume" />
        <QuickLink href="/marketplace" icon={Store} label="Project marketplace" />
      </RiseInView>
    </RiseGroup>
  );
}

function ContinueCard({ p }: { p: Awaited<ReturnType<typeof getMyPaths>>[number] }) {
  const tag = p.path.domainTag as DomainTag;
  const dot = p.nextDot!;
  return (
    <TiltCard style={domainVars(tag)} className="group relative isolate overflow-hidden rounded-3xl border bg-card p-6 shadow-sm sm:p-8" max={3}>
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_right,black,transparent_70%)]" aria-hidden />
      <div className="absolute -top-20 -right-20 -z-10 size-72 animate-drift rounded-full opacity-25 blur-3xl" style={{ background: domainTheme[tag].hex }} aria-hidden />
      <div className="absolute -bottom-24 left-1/3 -z-10 size-56 animate-drift rounded-full bg-primary opacity-10 blur-3xl [animation-delay:-7s]" aria-hidden />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Continue learning
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {p.path.title} · Dot {dot.order} of {p.total}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">{dot.title}</h2>
          <p className="mt-1 max-w-xl text-muted-foreground">{dot.description}</p>
          <Button asChild size="lg" className="relative mt-5 h-11 overflow-hidden rounded-full px-6 shadow-lg shadow-primary/20">
            <Link href={`/learn/${p.path.slug}/${dot.order}`}>
              Go <ArrowRight data-icon="inline-end" className="transition-transform group-hover:translate-x-1" />
              <span className="absolute inset-y-0 left-0 w-1/3 animate-shimmer bg-linear-to-r from-transparent via-white/30 to-transparent" aria-hidden />
            </Link>
          </Button>
        </div>
        <AnimatedRing
          value={p.percent}
          size={112}
          stroke={9}
          barClassName="stroke-[var(--d)]"
          label={
            <span className="text-base">
              {p.done}/{p.total}
            </span>
          }
          className="shrink-0 self-start sm:self-center"
          delay={0.4}
        />
      </div>
    </TiltCard>
  );
}

function FeedCard({ title, href, icon: Icon, children }: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="h-full rounded-2xl border bg-card p-3 shadow-xs">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-muted-foreground" /> {title}
        </h2>
        <Link href={href} className="text-sm text-muted-foreground hover:text-foreground">
          See all
        </Link>
      </div>
      <div>{children}</div>
    </section>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 font-medium shadow-xs transition-all hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
      <Icon className="size-4 text-primary transition-transform group-hover:scale-110" /> {label}
    </Link>
  );
}
