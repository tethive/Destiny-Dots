import { cn } from "@/lib/utils";

/** 12-week activity grid — sequential single hue (primary), light → dark. */
export function ActivityHeatmap({ days, animated = false }: { days: { date: string; count: number }[]; animated?: boolean }) {
  const steps = ["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"];
  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const active = days.filter((d) => d.count > 0).length;

  return (
    <figure>
      <div className="grid auto-cols-fr grid-flow-col grid-rows-7 gap-[3px]" role="img" aria-label={`Activity on ${active} of the last ${days.length} days`}>
        {days.map((d, i) => (
          <span
            key={d.date}
            style={animated ? { animationDelay: `${300 + i * 6}ms` } : undefined}
            title={`${fmt(d.date)}: ${d.count} ${d.count === 1 ? "activity" : "activities"}`}
            className={cn("aspect-square w-full min-w-2.5 rounded-[3px] ring-inset transition-transform hover:scale-125 hover:ring-2 hover:ring-foreground/40", animated && "animate-cell-in", steps[level(d.count)])}
          />
        ))}
      </div>
      <figcaption className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Active {active} of the last {days.length} days
        </span>
        <span className="flex items-center gap-1" aria-hidden>
          Less
          {steps.map((s) => (
            <span key={s} className={cn("size-2.5 rounded-[3px]", s)} />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}
