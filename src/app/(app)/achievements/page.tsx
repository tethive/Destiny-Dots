import type { Metadata } from "next";
import { Flame, Trophy } from "lucide-react";
import { ActivityHeatmap } from "@/components/app/activity-heatmap";
import { PageHeader, StatCard } from "@/components/app/page-header";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { getAchievements, getActivity, getCompletedDotIds } from "@/server/learning";

export const metadata: Metadata = { title: "Achievements" };

export default async function AchievementsPage() {
  const user = await requireUser("/achievements");
  const [achievements, activity, completed] = await Promise.all([
    getAchievements(user.id),
    getActivity(user.id),
    getCompletedDotIds(user.id),
  ]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Achievements" description="Milestones you've cleared on your journey." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Unlocked" value={`${unlocked}/${achievements.length}`} icon={Trophy} />
        <StatCard label="Current streak" value={`${activity.streak} days`} hint={`Longest: ${activity.longest} days`} icon={Flame} />
        <StatCard label="Dots completed" value={completed.size} />
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="mb-4 font-semibold">Last 12 weeks</h2>
        <ActivityHeatmap days={activity.days} />
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((a) => (
          <div
            key={a.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-xs",
              !a.unlocked && "bg-muted/30",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-12 items-center justify-center rounded-2xl [transform:perspective(400px)_rotateY(-12deg)]",
                  a.unlocked
                    ? "bg-linear-to-br from-primary to-brand-2 text-white shadow-lg shadow-primary/30"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <a.icon className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", a.unlocked ? "bg-success" : "bg-primary/60")}
                  style={{ width: `${(a.current / a.target) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {a.current}/{a.target}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
