import Link from "next/link";
import { Award, Check, Lock } from "lucide-react";
import { Logo, LogoBadge } from "@/components/brand/logo";
import { DomainBadge } from "@/components/domain";
import { GridBackdrop } from "@/components/effects/orbit";
import { ProgressRing } from "@/components/progress-ring";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

const points = [
  "Roadmaps across 11 tech domains",
  "Hand-picked resources, not endless search results",
  "Progress saved dot by dot",
];

const illustration = [
  { label: "Networking fundamentals", state: "done" },
  { label: "Linux & Windows basics", state: "done" },
  { label: "Log analysis & SIEM", state: "current" },
  { label: "Incident response", state: "locked" },
  { label: "CompTIA Security+", state: "locked" },
] as const;

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,0.95fr)]">
      {/* Form column */}
      <div className="flex flex-col px-4 py-5 sm:px-10 lg:px-16">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link href="/resources" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Explore resources
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">{children}</main>

        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © {new Date().getFullYear()} {siteConfig.legalEntity} ·{" "}
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>{" "}
          ·{" "}
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </p>
      </div>

      {/* Showcase panel */}
      <aside className="relative isolate hidden overflow-hidden border-l bg-muted/40 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <GridBackdrop />

        <div>
          <LogoBadge size={88} priority />
          <h2 className="mt-6 max-w-md text-4xl leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
            Every career is a series of dots. <span className="text-brand-gradient">Let&apos;s connect yours.</span>
          </h2>
        </div>

        {/* 3D product card */}
        <div className="relative my-10 [perspective:1400px]" aria-hidden>
          <div className="mx-auto w-full max-w-sm animate-float [transform:rotateX(14deg)_rotateY(-18deg)_rotateZ(2deg)] [transform-style:preserve-3d] motion-reduce:animate-none">
            <div className="rounded-2xl border bg-card p-5 shadow-2xl shadow-foreground/15">
              <div className="flex items-start justify-between">
                <div>
                  <DomainBadge tag="cybersecurity" label="Cybersecurity" />
                  <p className="mt-2 font-semibold">SOC Analyst</p>
                  <p className="text-xs text-muted-foreground">Dot 3 of 9</p>
                </div>
                <ProgressRing value={22} size={48} stroke={4} label="2/9" barClassName="stroke-success" />
              </div>
              <ol className="mt-5">
                {illustration.map((d, i) => (
                  <li key={d.label} className="relative flex items-center gap-3 pb-3.5 last:pb-0">
                    {i < illustration.length - 1 && (
                      <span
                        className={cn(
                          "absolute top-6 left-[11px] h-[calc(100%-12px)] w-0.5",
                          d.state === "done" ? "bg-success/70" : "bg-border",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex size-6 items-center justify-center rounded-full",
                        d.state === "done" && "bg-success text-white",
                        d.state === "current" && "bg-primary ring-4 ring-primary/20",
                        d.state === "locked" && "border-2 border-locked bg-card text-muted-foreground",
                      )}
                    >
                      {d.state === "done" && <Check className="size-3" strokeWidth={3} />}
                      {d.state === "current" && <span className="size-2 rounded-full bg-white" />}
                      {d.state === "locked" && <Lock className="size-2.5" />}
                    </span>
                    <span className={cn("text-sm", d.state === "current" ? "font-semibold" : "text-muted-foreground")}>
                      {d.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="surface-glass absolute -right-6 -bottom-5 flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 [transform:translateZ(60px)]">
              <span className="flex size-6 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Award className="size-3.5" />
              </span>
              <span className="text-xs font-medium">Security+ milestone</span>
            </div>
          </div>
        </div>

        <ul className="space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
