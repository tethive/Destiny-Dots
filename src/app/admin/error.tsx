"use client";

import { ErrorView } from "@/components/status/error-view";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView compact error={error} reset={reset} homeHref="/admin" homeLabel="Back to admin overview" />;
}
