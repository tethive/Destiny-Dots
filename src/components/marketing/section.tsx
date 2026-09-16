import { GridBackdrop } from "@/components/effects/orbit";
import { Reveal, SplitText } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-[2.6rem] sm:leading-[1.1]">{title}</h2>
      {description && (
        <p className="mt-4 text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">{description}</p>
      )}
    </Reveal>
  );
}

/**
 * Page opener for inner public pages: fine grid, soft brand glow that runs
 * under the transparent header, animated title, optional 3D aside.
 */
export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  children,
  aside,
  tint,
  compact = false,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  aside?: React.ReactNode;
  tint?: string;
  compact?: boolean;
}) {
  return (
    <section className="relative isolate -mt-16 overflow-hidden border-b pt-16">
      <GridBackdrop tint={tint} />
      <div
        className={cn(
          "container-page grid items-center gap-12",
          aside && "lg:grid-cols-[1.25fr_1fr]",
          compact ? "py-14 sm:py-16" : "py-16 sm:py-24",
        )}
      >
        <div>
          {eyebrow && (
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                {eyebrow}
              </div>
            </Reveal>
          )}
          <h1 className="mt-5 text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
            <SplitText text={title} />
            {highlight && (
              <>
                {" "}
                <SplitText text={highlight} wordClassName="text-brand-gradient" delay={title.split(" ").length * 0.05} />
              </>
            )}
          </h1>
          {description && (
            <Reveal delay={0.25}>
              <p className="mt-5 max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg sm:leading-8">
                {description}
              </p>
            </Reveal>
          )}
          {children && <Reveal delay={0.35}>{children}</Reveal>}
        </div>
        {aside && <div className="hidden lg:block">{aside}</div>}
      </div>
    </section>
  );
}
