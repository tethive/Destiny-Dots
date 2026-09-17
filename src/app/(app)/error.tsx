"use client";

import { ErrorView } from "@/components/status/error-view";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView compact error={error} reset={reset} homeHref="/dashboard" homeLabel="Back to dashboard" />;
}
