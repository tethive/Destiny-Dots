import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
      <Image src="/logo-mark.png" alt="" width={28} height={28} className="size-7" priority />
      <span className="text-[0.975rem] font-semibold tracking-tight text-foreground">Destiny Dots</span>
    </Link>
  );
}
