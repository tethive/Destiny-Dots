import { cn } from "@/lib/utils";

/** Infinite horizontal ticker with faded edges. Pauses on hover. */
export function Marquee({
  children,
  reverse = false,
  duration = 40,
  className,
}: {
  children: React.ReactNode;
  reverse?: boolean;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
        className,
      )}
      style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
    >
      <div
        className={cn(
          "flex w-max shrink-0 animate-marquee gap-3 pr-3 group-hover:[animation-play-state:paused] motion-reduce:animate-none",
          reverse && "[animation-direction:reverse]",
        )}
      >
        {children}
        <div className="flex gap-3" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
