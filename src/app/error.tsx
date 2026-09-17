"use client";

import { ErrorView } from "@/components/status/error-view";
import { StatusShell } from "@/components/status/status-shell";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <StatusShell>
      <ErrorView error={error} reset={reset} />
    </StatusShell>
  );
}
