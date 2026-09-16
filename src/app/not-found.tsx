import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { GridBackdrop } from "@/components/effects/orbit";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <GridBackdrop />
      <Logo className="mb-12" />
      <div className="flex items-center justify-center gap-2" aria-hidden>
        <span className="size-4 rounded-full bg-primary" />
        <span className="h-0.5 w-10 bg-primary/50" />
        <span className="size-4 rounded-full bg-primary" />
        <span className="h-0.5 w-10 bg-[repeating-linear-gradient(to_right,var(--locked)_0_4px,transparent_4px_9px)]" />
        <span className="size-4 rounded-full border-2 border-dashed border-locked" />
      </div>
      <p className="mt-8 font-mono text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">This dot doesn&apos;t connect anywhere</h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        The page you&apos;re looking for has moved or never existed. Let&apos;s get you back on your path.
      </p>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="h-10 rounded-full px-5">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-10 rounded-full px-5">
          <Link href="/resources">Explore resources</Link>
        </Button>
      </div>
    </div>
  );
}
