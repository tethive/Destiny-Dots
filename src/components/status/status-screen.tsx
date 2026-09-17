import { AlertTriangle, CheckCircle2, Clock, type LucideIcon, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusTone = "success" | "error" | "warning" | "info";

const tones: Record<StatusTone, { icon: LucideIcon; ring: string; badge: string; glow: string }> = {
  success: {
    icon: CheckCircle2,
    ring: "bg-success/25",
    badge: "bg-success text-white shadow-success/30",
    glow: "var(--success)",
  },
  error: {
    icon: XCircle,
    ring: "bg-destructive/25",
    badge: "bg-destructive text-white shadow-destructive/30",
    glow: "var(--destructive)",
  },
  warning: {
    icon: AlertTriangle,
    ring: "bg-amber-500/25",
    badge: "bg-amber-500 text-white shadow-amber-500/30",
    glow: "oklch(0.77 0.16 70)",
  },
  info: {
    icon: Clock,
    ring: "bg-primary/25",
    badge: "bg-primary text-primary-foreground shadow-primary/30",
    glow: "var(--primary)",
  },
};

/**
 * Shared layout for error, success and status pages: an animated status badge,
 * the brand "connected dots" motif, a title, supporting copy and actions.
 * CSS-only animation, so it renders from server and client components alike.
 */
export function StatusScreen({
  tone,
  code,
  title,
  description,
  actions,
  children,
  icon,
  compact = false,
}: {
  tone: StatusTone;
  /** Small mono label above the title, e.g. "404" or "Payment confirmed". */
  code?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** Extra content under the description (details, reference IDs, lists). */
  children?: React.ReactNode;
  icon?: LucideIcon;
  /** Inside the app shell: no full-height centring or backdrop. */
  compact?: boolean;
}) {
  const t = tones[tone];
  const Icon = icon ?? t.icon;

  return (
    <div className={cn("relative isolate flex flex-col items-center justify-center px-4 text-center", compact ? "py-16" : "min-h-[calc(100dvh-8rem)] py-16")}>
      {!compact && (
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_35%,black_20%,transparent_100%)]" />
          <div
            className="absolute top-[12%] left-1/2 size-[28rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{
              background: `radial-gradient(closest-side, ${t.glow}, transparent)`,
            }}
          />
        </div>
      )}

      {/* Status badge with a soft pulsing ring */}
      <div className="relative flex size-20 animate-pop items-center justify-center">
        <span className={cn("absolute inset-0 animate-pulse-ring rounded-full", t.ring)} aria-hidden />
        <span className={cn("absolute inset-2 rounded-full opacity-60", t.ring)} aria-hidden />
        <span className={cn("relative flex size-14 items-center justify-center rounded-full shadow-lg", t.badge)}>
          <Icon className="size-7" aria-hidden />
        </span>
      </div>

      {/* Brand motif: a path of dots, the last one reflecting the outcome */}
      <div className="animate-rise mt-6 flex items-center justify-center gap-1.5" style={{ animationDelay: "0.1s" }} aria-hidden>
        <span className="size-2.5 rounded-full bg-primary" />
        <span className="h-0.5 w-8 bg-primary/40" />
        <span className="size-2.5 rounded-full bg-primary" />
        <span
          className={cn("h-0.5 w-8", tone === "success" ? "bg-success/50" : "bg-[repeating-linear-gradient(to_right,var(--locked)_0_4px,transparent_4px_9px)]")}
        />
        <span
          className={cn(
            "size-2.5 rounded-full",
            tone === "success" && "bg-success",
            tone === "error" && "border-2 border-destructive",
            tone === "warning" && "border-2 border-amber-500",
            tone === "info" && "border-2 border-dashed border-locked",
          )}
        />
      </div>

      {code && (
        <p className="animate-rise mt-6 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase" style={{ animationDelay: "0.15s" }}>
          {code}
        </p>
      )}
      <h1
        className={cn("animate-rise max-w-xl text-3xl font-semibold tracking-[-0.03em] text-balance sm:text-4xl", code ? "mt-2" : "mt-6")}
        style={{ animationDelay: "0.2s" }}
      >
        {title}
      </h1>
      {description && (
        <div className="animate-rise mx-auto mt-3 max-w-md text-pretty text-muted-foreground" style={{ animationDelay: "0.28s" }}>
          {description}
        </div>
      )}
      {children && (
        <div className="animate-rise mt-6 w-full max-w-md" style={{ animationDelay: "0.34s" }}>
          {children}
        </div>
      )}
      {actions && (
        <div className="animate-rise mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row" style={{ animationDelay: "0.4s" }}>
          {actions}
        </div>
      )}
    </div>
  );
}

/** Label/value rows for receipts and references. */
export function StatusDetails({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="divide-y rounded-2xl border bg-card text-left text-sm shadow-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
