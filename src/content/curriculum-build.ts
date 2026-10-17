/**
 * Expands the curriculum into the dots that get written to the database.
 *
 * Shared-module topics keep a stable `topicKey` (e.g. "S4.07") across every path
 * that uses them, which is what lets progress tick everywhere at once. A path's
 * own topics are keyed to that path ("CY1.U07") so they stay private to it.
 */
import { curriculumPaths, sharedModules, type CurriculumPath } from "@/content/curriculum";
import type { DomainTag, Level } from "@/lib/catalog";

/** Career-skills module reads better after the path's own job-ready topics. */
const TRAILING_MODULE = "S20";

/** Rough pace used to turn a topic count into the duration shown on cards. */
const HOURS_PER_DOT = 3;
const HOURS_PER_WEEK = 8;

/** The first dots of every path are free to try. */
export const FREE_DOTS_PER_PATH = 2;

const moduleByCode = new Map(sharedModules.map((m) => [m.code, m]));

export interface BuiltDot {
  order: number;
  title: string;
  description: string;
  hours: number;
  isFree: boolean;
  /** Stable across paths for shared-module topics. */
  topicKey: string;
  /** Set only for dots that come from a shared module. */
  moduleCode?: string;
  certification?: string;
}

export interface BuiltPath {
  code: string;
  slug: string;
  domainTag: DomainTag;
  title: string;
  summary: string;
  level: Level;
  duration: string;
  roles: string[];
  outcomes: string[];
  dots: BuiltDot[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "Certification prep: Security+ / CySA+" -> "Security+ / CySA+" */
function certificationOf(title: string) {
  const m = /^Certification prep:\s*(.+)$/i.exec(title);
  return m ? m[1].trim() : undefined;
}

function moduleTopics(ref: CurriculumPath["modules"][number]) {
  const mod = moduleByCode.get(ref.code);
  if (!mod) throw new Error(`Unknown shared module ${ref.code}`);
  const picks = ref.picks ?? mod.topics.map((_, i) => i + 1);
  return picks
    .filter((n) => n >= 1 && n <= mod.topics.length)
    .map((n) => ({
      title: mod.topics[n - 1],
      topicKey: `${mod.code}.${pad(n)}`,
      moduleCode: mod.code,
      description: `Shared module: ${mod.name}. Finish it once and it counts in every path that uses it.`,
    }));
}

export function buildPath(path: CurriculumPath): BuiltPath {
  const refs = [...path.modules];
  // Career skills close the roadmap rather than interrupting it.
  const trailing = refs.at(-1)?.code === TRAILING_MODULE ? refs.pop() : undefined;

  const shared = refs.flatMap(moduleTopics);
  let unique = 0;
  const own = path.sections.flatMap((section) =>
    section.topics.map((title) => ({
      title,
      topicKey: `${path.code}.U${pad(++unique)}`,
      moduleCode: undefined as string | undefined,
      description: `${path.title} · ${section.label}`,
    })),
  );
  const tail = trailing ? moduleTopics(trailing) : [];

  const dots: BuiltDot[] = [...shared, ...own, ...tail].map((t, i) => ({
    order: i + 1,
    title: t.title,
    description: t.description,
    hours: HOURS_PER_DOT,
    isFree: i < FREE_DOTS_PER_PATH,
    topicKey: t.topicKey,
    moduleCode: t.moduleCode,
    certification: certificationOf(t.title),
  }));

  const weeks = Math.max(1, Math.round((dots.length * HOURS_PER_DOT) / HOURS_PER_WEEK));
  const jobReady = path.sections.find((s) => s.label.startsWith("Job-ready"));

  return {
    code: path.code,
    slug: path.slug,
    domainTag: path.domainTag,
    title: path.title,
    summary: `${dots.length} topics from fundamentals to job-ready${path.prereq ? `, after ${path.prereq}` : ""}.`,
    level: path.prereq ? "Intermediate" : "Beginner",
    duration: `${weeks} weeks`,
    roles: [path.title],
    outcomes: (jobReady?.topics ?? []).slice(0, 4),
    dots,
  };
}

export const buildCurriculum = () => curriculumPaths.map(buildPath);
