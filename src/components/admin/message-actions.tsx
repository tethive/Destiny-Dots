"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Ban, Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setMessageStatus } from "@/server/actions/admin";

export function MessageActions({ id, email, topic, status }: { id: string; email: string; topic: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (s: "NEW" | "REPLIED" | "CLOSED" | "SPAM") =>
    start(async () => {
      const res = await setMessageStatus(id, s);
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button asChild size="sm" className="rounded-full">
        <a href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Re: ${topic}`)}`} onClick={() => status === "NEW" && set("REPLIED")}>
          <Mail /> Reply by email
        </a>
      </Button>
      {status !== "REPLIED" && (
        <Button size="sm" variant="outline" className="rounded-full" disabled={pending} onClick={() => set("REPLIED")}>
          <Check /> Mark replied
        </Button>
      )}
      {status !== "CLOSED" && (
        <Button size="sm" variant="ghost" className="rounded-full" disabled={pending} onClick={() => set("CLOSED")}>
          <Archive /> Close
        </Button>
      )}
      {status !== "SPAM" && (
        <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" disabled={pending} onClick={() => set("SPAM")}>
          <Ban /> Spam
        </Button>
      )}
    </div>
  );
}
