"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { joinMarketplaceWaitlist } from "@/server/actions/student";

export function WaitlistForm() {
  const [interest, setInterest] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await joinMarketplaceWaitlist(interest);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        });
      }}
    >
      <Textarea
        rows={3}
        value={interest}
        onChange={(e) => setInterest(e.target.value)}
        maxLength={200}
        placeholder="Optional: what would you list or buy? e.g. IoT home automation kit"
      />
      <Button type="submit" size="lg" className="h-10 rounded-full px-5" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Join the waitlist
      </Button>
    </form>
  );
}
