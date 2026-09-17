import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Paths of the generated brand images (see scripts/generate-brand-assets.mjs). */
export const brandImages = {
  badge: "/brand/logo-badge.png",
};

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      aria-label="Destiny Dots home"
    >
      <Image src={brandImages.badge} alt="" width={40} height={40} className="size-10" priority />
      <span className="text-[0.975rem] font-semibold tracking-tight text-foreground">Destiny Dots</span>
    </Link>
  );
}

/** The full round badge ("Explore · Learn · Choose · Grow") for places with room for it. */
export function LogoBadge({ size = 96, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src={brandImages.badge}
      alt="Destiny Dots — Explore · Learn · Choose · Grow"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("drop-shadow-[0_8px_24px_rgb(91_63_214/0.25)]", className)}
      priority={priority}
    />
  );
}
