"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, LoaderCircle, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { openDispute, saveReview } from "@/server/actions/marketplace";

export function ReviewForm({ projectId, initial }: { projectId: string; initial?: { rating: number; body: string } }) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-3 rounded-2xl border bg-card p-4 shadow-xs"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return void toast.error("Pick a star rating.");
        start(async () => {
          const res = await saveReview(projectId, { rating, body });
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <p className="font-medium">{initial ? "Update your review" : "Rate this project"}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
            <Star className={cn("size-6 transition-colors", (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} placeholder="What did you learn? Was the code clear and complete?" />
      <Button type="submit" size="sm" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} {initial ? "Update review" : "Post review"}
      </Button>
    </form>
  );
}

const reasons = ["Files missing or broken", "Not as described", "Plagiarised or not the seller's work", "Other"] as const;

export function DisputeDialog({ purchaseId, holdDays }: { purchaseId: string; holdDays: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasons)[number]>(reasons[0]);
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Flag /> Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            Available for {holdDays} days after purchase. The seller&apos;s earnings are held while our team reviews it, and you&apos;ll be refunded if the claim is upheld.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {reasons.map((r) => (
            <label key={r} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm", reason === r && "border-primary bg-primary/5")}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-primary" />
              {r}
            </label>
          ))}
        </div>
        <Textarea rows={4} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} placeholder="Describe what's wrong — which files, what you expected, what happened." />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await openDispute(purchaseId, { reason, details });
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
