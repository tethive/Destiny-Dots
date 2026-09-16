import { Award, Briefcase, FileUser, Newspaper, Store } from "lucide-react";
import { Marquee } from "@/components/motion/marquee";
import { Stagger, StaggerItem } from "@/components/motion/reveal";
import { TiltCard } from "@/components/motion/tilt-card";
import { cn } from "@/lib/utils";

/** "Beyond the roadmap" feature grid with small live product illustrations. */
export function FeatureBento() {
  return (
    <Stagger className="mt-14 grid gap-4 md:grid-cols-6">
      <StaggerItem className="md:col-span-4">
        <Tile icon={Award} title="Certification guides" body="Exam format, difficulty, prep time and resources for AWS, Microsoft, CompTIA, OSCP, Unity and more.">
          <CertStack />
        </Tile>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <Tile icon={FileUser} title="Resume builder" body="Clean template, live preview, recruiter-ready PDF.">
          <ResumeMock />
        </Tile>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <Tile icon={Briefcase} title="Job listings" body="Curated openings for your domain and level, refreshed weekly.">
          <JobsMock />
        </Tile>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <Tile icon={Newspaper} title="Tech updates" body="A short weekly digest for the domains you follow.">
          <div className="overflow-hidden rounded-lg border bg-background py-2">
            <Marquee duration={22}>
              {["This week in Cloud", "This week in Cyber", "This week in AI/ML", "This week in 5G", "This week in AR/VR"].map((n) => (
                <span key={n} className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary" /> {n}
                </span>
              ))}
            </Marquee>
          </div>
        </Tile>
      </StaggerItem>
      <StaggerItem className="md:col-span-2">
        <Tile icon={Store} title="Project marketplace" body="Showcase and trade real student projects." soon>
          <div className="space-y-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 rounded-full bg-linear-to-r from-primary to-brand-2" />
            </div>
            <p className="text-xs text-muted-foreground">In development — Phase 2</p>
          </div>
        </Tile>
      </StaggerItem>
    </Stagger>
  );
}

function Tile({
  icon: Icon,
  title,
  body,
  soon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  soon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TiltCard max={3} className="rounded-2xl">
      <div className="flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border bg-card p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/60 text-foreground">
              <Icon className="size-4" />
            </span>
            <h3 className="font-semibold tracking-tight">{title}</h3>
            {soon && (
              <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                Soon
              </span>
            )}
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
        {children}
      </div>
    </TiltCard>
  );
}

/** Three certificate cards fanned out in 3D; they spread on hover. */
function CertStack() {
  const certs = [
    { name: "AWS SAA-C03", org: "Amazon Web Services", tone: "from-amber-400 to-orange-500" },
    { name: "CompTIA Security+", org: "CompTIA", tone: "from-rose-400 to-red-600" },
    { name: "AZ-104", org: "Microsoft", tone: "from-sky-400 to-blue-600" },
  ];
  return (
    <div className="relative h-36 [perspective:900px]" aria-hidden>
      {certs.map((c, i) => (
        <div
          key={c.name}
          className={cn(
            "absolute top-2 left-1/2 w-56 rounded-xl border bg-card p-3 shadow-lg transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            i === 0 && "[transform:translateX(-120%)_rotateY(18deg)_rotateZ(-4deg)] group-hover/tilt:[transform:translateX(-135%)_rotateY(12deg)_rotateZ(-6deg)]",
            i === 1 && "z-10 [transform:translateX(-50%)_translateZ(40px)] group-hover/tilt:[transform:translateX(-50%)_translateZ(70px)_translateY(-6px)]",
            i === 2 && "[transform:translateX(20%)_rotateY(-18deg)_rotateZ(4deg)] group-hover/tilt:[transform:translateX(35%)_rotateY(-12deg)_rotateZ(6deg)]",
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className={cn("flex size-9 items-center justify-center rounded-full bg-linear-to-br text-white shadow-inner", c.tone)}>
              <Award className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{c.org}</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="h-1 rounded-full bg-muted" />
            <div className="h-1 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResumeMock() {
  return (
    <div className="flex justify-center [perspective:700px]" aria-hidden>
      <div className="w-32 rounded-md border bg-background p-3 shadow-xl transition-transform duration-500 [transform:rotateX(14deg)_rotateZ(-4deg)] group-hover/tilt:[transform:rotateX(0deg)_rotateZ(0deg)_scale(1.04)]">
        <div className="h-2 w-14 rounded bg-foreground/80" />
        <div className="mt-1.5 h-1 w-20 rounded bg-primary/70" />
        {[92, 80, 86, 64, 74].map((w, i) => (
          <div key={i} className="mt-2 h-1 rounded bg-muted-foreground/20" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

function JobsMock() {
  return (
    <div className="space-y-2" aria-hidden>
      {["SOC Analyst L1 · Remote", "Cloud Engineer · Bengaluru"].map((j, i) => (
        <div
          key={j}
          className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-xs transition-transform duration-500 group-hover/tilt:translate-x-1"
          style={{ transitionDelay: `${i * 60}ms` }}
        >
          <span className="truncate">{j}</span>
          <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">New</span>
        </div>
      ))}
    </div>
  );
}
