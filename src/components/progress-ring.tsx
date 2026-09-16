import { cn } from "@/lib/utils";

/** Circular % complete ring — used on path cards and the dashboard. */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  className,
  barClassName = "stroke-primary",
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  barClassName?: string;
  label?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(pct)}% complete`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          className={cn("transition-[stroke-dashoffset] duration-700", barClassName)}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold tabular-nums">{label ?? `${Math.round(pct)}%`}</span>
    </div>
  );
}
