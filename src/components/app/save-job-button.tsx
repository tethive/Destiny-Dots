"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { toggleSavedJob } from "@/server/actions/student";

export function SaveJobButton({ jobId, saved }: { jobId: string; saved: boolean }) {
  const [on, setOn] = useState(saved);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? "Remove from saved jobs" : "Save job"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          const res = await toggleSavedJob(jobId);
          if (!res.ok) {
            setOn(on);
            toast.error(res.error);
          }
        })
      }
      className={cn(
        "flex size-9 items-center justify-center rounded-full border transition-colors hover:bg-muted",
        on ? "border-rose-500/40 text-rose-500" : "text-muted-foreground",
      )}
    >
      <Heart className={cn("size-4", on && "fill-current")} />
    </button>
  );
}
