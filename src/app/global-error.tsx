"use client";

import "./globals.css";

/**
 * Last-resort boundary when the root layout itself fails. It replaces the whole
 * document, so it can't rely on providers or fonts — plain markup only.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center" style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-3 rounded-full bg-primary" />
            <span className="h-0.5 w-8 bg-primary/40" />
            <span className="size-3 rounded-full bg-primary" />
            <span className="h-0.5 w-8 bg-[repeating-linear-gradient(to_right,var(--locked)_0_4px,transparent_4px_9px)]" />
            <span className="size-3 rounded-full border-2 border-destructive" />
          </div>
          <p className="mt-6 font-mono text-xs tracking-[0.18em] text-muted-foreground uppercase">Destiny Dots · Error</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">We couldn&apos;t load the site</h1>
          <p className="mt-3 max-w-md text-muted-foreground">A temporary problem stopped the page from loading. Please try again in a moment.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => reset()} className="h-11 rounded-full bg-primary px-6 font-medium text-primary-foreground">
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the router may be unavailable here */}
            <a href="/" className="flex h-11 items-center justify-center rounded-full border px-6 font-medium">
              Go home
            </a>
          </div>
          {error.digest && <p className="mt-6 font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
