import { DomainIcon } from "@/components/domain";
import { domains, type DomainTag } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * Domain icons riding tilted 3D orbits around a glowing core. Pure CSS 3D:
 * each ring is tilted in X, spins in Z, and every icon counter-rotates so it
 * stays upright and readable.
 */
export function OrbitingDomains({
  className,
  tags,
  center,
}: {
  className?: string;
  tags?: DomainTag[];
  center?: React.ReactNode;
}) {
  const list = (tags ?? domains.map((d) => d.tag)).slice(0, 11);
  const inner = list.slice(0, 4);
  const outer = list.slice(4);
  const rings = [
    { items: inner, size: 58, duration: 36 },
    { items: outer, size: 100, duration: 60 },
  ];

  return (
    <div className={cn("relative aspect-square [container-type:inline-size] [perspective:1200px]", className)} aria-hidden>
      <div className="absolute inset-0 [transform-style:preserve-3d] [transform:rotateX(62deg)]">
        {rings.map((ring, r) => (
          <div
            key={r}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
            style={{ width: `${ring.size}%`, height: `${ring.size}%` }}
          >
            <div className="absolute inset-0 rounded-full border border-dashed border-foreground/15" />
            <div
              className="absolute inset-0 animate-orbit [transform-style:preserve-3d] motion-reduce:animate-none"
              style={{ "--orbit-duration": `${ring.duration}s` } as React.CSSProperties}
            >
              {ring.items.map((tag, i) => {
                const angle = (360 / ring.items.length) * i;
                return (
                  <div
                    key={tag}
                    className="absolute left-1/2 top-1/2 [transform-style:preserve-3d]"
                    style={{ transform: `rotate(${angle}deg) translateY(calc(-${ring.size / 2}cqw)) rotate(-${angle}deg)` }}
                  >
                    {/* Undo the orbit spin and the ring tilt so icons face the viewer */}
                    <div
                      className="absolute size-0 animate-orbit [animation-direction:reverse] [transform-style:preserve-3d] motion-reduce:animate-none"
                      style={{ "--orbit-duration": `${ring.duration}s` } as React.CSSProperties}
                    >
                      <div className="absolute -translate-x-1/2 -translate-y-1/2 [transform:rotateX(-62deg)]">
                        <DomainIcon
                          tag={tag}
                          className="size-10 rounded-xl border bg-card shadow-lg shadow-foreground/5 sm:size-12 [&_svg]:size-5"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {center ?? <Core />}
      </div>
    </div>
  );
}

function Core() {
  return (
    <div className="relative flex size-20 items-center justify-center">
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30 motion-reduce:animate-none" />
      <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--primary)_40%,white),var(--primary)_55%,color-mix(in_oklch,var(--primary)_60%,black))] shadow-[0_0_60px_-6px_var(--primary)]" />
    </div>
  );
}

/** Static stand-in for the WebGL globe (no WebGL / error). */
export function OrbitFallback() {
  return (
    <div className="flex size-full items-center justify-center">
      <OrbitingDomains className="w-[90%]" />
    </div>
  );
}

/** Soft grid + brand glow backdrop for page openers. */
export function GridBackdrop({ className, tint }: { className?: string; tint?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden>
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_30%,transparent_100%)]" />
      <div
        className="absolute left-1/2 top-[-18rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${tint ? `color-mix(in oklch, ${tint} 30%, transparent)` : "var(--glow)"}, transparent)` }}
      />
    </div>
  );
}
