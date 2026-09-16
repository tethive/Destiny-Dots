import "server-only";
import { cache } from "react";
import { Award, Bookmark, Flame, Footprints, GraduationCap, ListChecks, Map as MapIcon, Medal, Rocket, ScrollText, type LucideIcon } from "lucide-react";
import { db } from "@/lib/db";
import { getPublishedPaths, type PathWithDots } from "@/server/catalog";

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export const getCompletedDotIds = cache(async (userId: string) => {
  const rows = await db.progress.findMany({ where: { userId }, select: { dotId: true } });
  return new Set(rows.map((r) => r.dotId));
});

export type PathProgress = {
  path: PathWithDots;
  done: number;
  total: number;
  percent: number;
  nextDot: PathWithDots["dots"][number] | null;
  lastActivityAt: Date;
  enrolledAt: Date;
  completedAt: Date | null;
};

export const getMyPaths = cache(async (userId: string): Promise<PathProgress[]> => {
  const [enrollments, completed, published] = await Promise.all([
    db.enrollment.findMany({ where: { userId }, orderBy: { lastActivityAt: "desc" } }),
    getCompletedDotIds(userId),
    getPublishedPaths(),
  ]);
  const byId = new Map(published.map((p) => [p.id, p]));
  return enrollments
    .map((e) => {
      const path = byId.get(e.pathId);
      if (!path) return null;
      const done = path.dots.filter((d) => completed.has(d.id)).length;
      const total = path.dots.length;
      return {
        path,
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 0,
        nextDot: path.dots.find((d) => !completed.has(d.id)) ?? null,
        lastActivityAt: e.lastActivityAt,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
      };
    })
    .filter((x): x is PathProgress => x !== null);
});

/* -------------------------------------------------------------------------- */
/* Streaks (IST calendar days)                                                 */
/* -------------------------------------------------------------------------- */

const IST_OFFSET = 330 * 60 * 1000;
const dayKey = (d: Date) => new Date(d.getTime() + IST_OFFSET).toISOString().slice(0, 10);

export const getActivity = cache(async (userId: string) => {
  const since = new Date(Date.now() - 120 * 86_400_000);
  const [progress, attempts] = await Promise.all([
    db.progress.findMany({ where: { userId, completedAt: { gte: since } }, select: { completedAt: true } }),
    db.quizAttempt.findMany({ where: { userId, createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);
  const counts = new Map<string, number>();
  for (const d of [...progress.map((p) => p.completedAt), ...attempts.map((a) => a.createdAt)]) {
    const k = dayKey(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  let streak = 0;
  const cursor = new Date();
  if (!counts.has(dayKey(cursor))) cursor.setTime(cursor.getTime() - 86_400_000); // yesterday still counts
  while (counts.has(dayKey(cursor))) {
    streak++;
    cursor.setTime(cursor.getTime() - 86_400_000);
  }
  let longest = 0;
  let run = 0;
  for (let i = 119; i >= 0; i--) {
    if (counts.has(dayKey(new Date(Date.now() - i * 86_400_000)))) longest = Math.max(longest, ++run);
    else run = 0;
  }
  const last12Weeks = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(Date.now() - (83 - i) * 86_400_000);
    return { date: dayKey(d), count: counts.get(dayKey(d)) ?? 0 };
  });
  return { streak, longest, days: last12Weeks };
});

/* -------------------------------------------------------------------------- */
/* Achievements                                                                */
/* -------------------------------------------------------------------------- */

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  unlocked: boolean;
  current: number;
  target: number;
};

export const getAchievements = cache(async (userId: string): Promise<Achievement[]> => {
  const [completed, myPaths, passed, bookmarks, resume, activity] = await Promise.all([
    getCompletedDotIds(userId),
    getMyPaths(userId),
    db.quizAttempt.findMany({ where: { userId, passed: true }, distinct: ["dotId"], select: { dotId: true } }),
    db.bookmark.count({ where: { userId } }),
    db.resume.findUnique({ where: { userId }, select: { userId: true } }),
    getActivity(userId),
  ]);
  const dots = completed.size;
  const pathsDone = myPaths.filter((p) => p.total > 0 && p.done === p.total).length;
  const certDots = myPaths.flatMap((p) => p.path.dots.filter((d) => d.certification && completed.has(d.id))).length;

  const defs: Omit<Achievement, "unlocked">[] = [
    { id: "first-step", title: "First step", description: "Enrol in your first path", icon: Footprints, current: Math.min(myPaths.length, 1), target: 1 },
    { id: "first-dot", title: "First dot", description: "Complete your first dot", icon: ListChecks, current: Math.min(dots, 1), target: 1 },
    { id: "five-dots", title: "Momentum", description: "Complete 5 dots", icon: Rocket, current: Math.min(dots, 5), target: 5 },
    { id: "twenty-five-dots", title: "Dot collector", description: "Complete 25 dots", icon: Medal, current: Math.min(dots, 25), target: 25 },
    { id: "checkpoint", title: "Checkpoint cleared", description: "Pass a checkpoint quiz", icon: GraduationCap, current: Math.min(passed.length, 1), target: 1 },
    { id: "streak-3", title: "On a roll", description: "Keep a 3-day streak", icon: Flame, current: Math.min(activity.longest, 3), target: 3 },
    { id: "streak-7", title: "Unstoppable week", description: "Keep a 7-day streak", icon: Flame, current: Math.min(activity.longest, 7), target: 7 },
    { id: "curator", title: "Curator", description: "Bookmark 5 resources", icon: Bookmark, current: Math.min(bookmarks, 5), target: 5 },
    { id: "resume", title: "Recruiter ready", description: "Create your resume", icon: ScrollText, current: resume ? 1 : 0, target: 1 },
    { id: "certified", title: "Certification milestone", description: "Complete a certification dot", icon: Award, current: Math.min(certDots, 1), target: 1 },
    { id: "path-complete", title: "Path finisher", description: "Complete every dot in a path", icon: MapIcon, current: Math.min(pathsDone, 1), target: 1 },
  ];
  return defs.map((d) => ({ ...d, unlocked: d.current >= d.target }));
});

/* -------------------------------------------------------------------------- */
/* Recommendations                                                             */
/* -------------------------------------------------------------------------- */

/** Rule-based picks from the onboarding answers. */
export const getRecommendations = cache(async (userId: string, limit = 3) => {
  const [profile, published, enrollments] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    getPublishedPaths(),
    db.enrollment.findMany({ where: { userId }, select: { pathId: true } }),
  ]);
  const enrolled = new Set(enrollments.map((e) => e.pathId));
  const interests = new Set(profile?.domainInterests ?? []);
  const stage = profile?.stage;
  const time = profile?.weeklyTime;

  const scored = published
    .filter((p) => !enrolled.has(p.id))
    .map((p) => {
      let score = 0;
      const reasons: string[] = [];
      if (interests.has(p.domainTag)) {
        score += 10;
        reasons.push("Matches your interests");
      }
      if (p.level === "BEGINNER" && (stage === "STUDENT" || stage === "FRESH_GRADUATE")) {
        score += 4;
        reasons.push("Beginner friendly");
      }
      if (p.level !== "BEGINNER" && stage === "WORKING_PROFESSIONAL") {
        score += 3;
        reasons.push("Builds on experience");
      }
      const hours = p.dots.reduce((n, d) => n + d.hours, 0);
      if (time === "UNDER_5" && hours < 140) score += 2;
      if (time === "OVER_10" && hours >= 140) score += 2;
      return { path: p, score, reason: reasons[0] ?? "Popular career path", hours };
    })
    .sort((a, b) => b.score - a.score || a.hours - b.hours);

  return scored.slice(0, limit);
});
