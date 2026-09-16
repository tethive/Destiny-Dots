import { Layers, Search, ShieldCheck } from "lucide-react";
import { domainTheme, domainVars } from "@/components/domain";
import type { DomainTag } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/** Isometric stack of three panes — how a roadmap is built, in 3D. */
export function IsoStack({ className }: { className?: string }) {
  const layers = [
    { icon: Search, label: "Research the role", tone: "bg-card" },
    { icon: Layers, label: "Break into dots", tone: "bg-card" },
    { icon: ShieldCheck, label: "Hand-pick resources", tone: "bg-primary text-primary-foreground" },
  ];
  return (
    <div className={cn("relative mx-auto h-[380px] w-full max-w-[420px] [perspective:1400px]", className)} aria-hidden>
      <div className="absolute inset-0 animate-float [transform-style:preserve-3d] motion-reduce:animate-none">
        <div className="absolute inset-0 [transform:rotateX(58deg)_rotateZ(-40deg)] [transform-style:preserve-3d]">
          {layers.map(({ icon: Icon, label, tone }, i) => (
            <div
              key={label}
              className={cn(
                "absolute top-1/2 left-1/2 flex h-44 w-64 -translate-x-1/2 -translate-y-1/2 flex-col justify-between rounded-2xl border p-4 shadow-2xl shadow-foreground/15",
                tone,
              )}
              style={{ transform: `translateZ(${i * 70}px)` }}
            >
              <div className="flex items-center gap-2">
                <span className={cn("flex size-8 items-center justify-center rounded-lg", i === 2 ? "bg-white/20" : "bg-muted")}>
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((d) => (
                  <span key={d} className="flex flex-1 items-center">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        i === 2 ? "bg-white" : d <= i + 1 ? "bg-primary" : "border border-locked",
                      )}
                    />
                    {d < 4 && <span className={cn("h-px flex-1", i === 2 ? "bg-white/50" : "bg-border")} />}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Domain icon on a floating 3D tile with orbit rings, tinted per domain. */
export function DomainEmblem({ tag, className }: { tag: DomainTag; className?: string }) {
  const Icon = domainTheme[tag].icon;
  return (
    <div
      style={domainVars(tag)}
      className={cn("relative mx-auto aspect-square w-full max-w-[340px] [perspective:1000px]", className)}
      aria-hidden
    >
      <div
        className="absolute inset-[18%] rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--d)" }}
      />
      <div className="absolute inset-0 [transform:rotateX(68deg)] [transform-style:preserve-3d]">
        {[100, 76].map((size, i) => (
          <div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-orbit rounded-full border border-dashed motion-reduce:animate-none"
            style={
              {
                width: `${size}%`,
                height: `${size}%`,
                borderColor: "color-mix(in oklch, var(--d) 45%, transparent)",
                "--orbit-duration": `${i ? 22 : 34}s`,
              } as React.CSSProperties
            }
          >
            <span className="d-solid absolute top-0 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_16px_2px_var(--d)]" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="animate-float motion-reduce:animate-none">
          <div className="d-text flex size-28 items-center justify-center rounded-3xl border bg-card shadow-2xl shadow-foreground/15 [transform:rotateX(12deg)_rotateY(-16deg)]">
            <span className="d-soft flex size-20 items-center justify-center rounded-2xl">
              <Icon className="size-10" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
