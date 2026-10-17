"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, FileUser, LoaderCircle, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { DomainIcon } from "@/components/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/progress-ring";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { domains } from "@/lib/catalog";
import { reviewMyResume } from "@/server/actions/interview";

type Review = NonNullable<Awaited<ReturnType<typeof reviewMyResume>> extends { review?: infer R } ? R : never>;

/**
 * Step one of the simulation: the resume gets screened for the role before
 * anyone asks a question, the same order a real hiring process runs in.
 */
export function ResumeReviewCard({ hasResume, defaultDomain }: { hasResume: boolean; defaultDomain?: string }) {
  const [domain, setDomain] = useState(defaultDomain ?? domains[0].tag);
  const [review, setReview] = useState<Review | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const res = await reviewMyResume(domain);
      if (!res.ok) return void toast.error(res.error);
      setReview(res.review ?? null);
    });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="flex items-center gap-2 font-semibold">
        <FileUser className="size-4 text-primary" /> Start with your resume
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Before the questions, get your resume screened the way a recruiter and an applicant tracking system would — then interview on what it claims.
      </p>

      {!hasResume ? (
        <Button asChild variant="outline" size="lg" className="mt-4 rounded-full">
          <Link href="/resume">Build your resume first</Link>
        </Button>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 space-y-1.5">
            <span className="text-sm font-medium">Screen it for</span>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d.tag} value={d.tag}>
                    <span className="flex items-center gap-2">
                      <DomainIcon tag={d.tag} className="size-4" /> {d.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <Button size="lg" className="rounded-full" disabled={pending} onClick={run}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {review ? "Screen again" : "Screen my resume"}
          </Button>
        </div>
      )}

      {review && (
        <div className="mt-5 space-y-4 border-t pt-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <ProgressRing value={review.score} size={96} stroke={9} label={`${review.score}`} />
            <p className="text-pretty text-sm">{review.verdict}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="size-4 text-success" /> Working well
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {review.strengths.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <CircleAlert className="size-4 text-amber-600 dark:text-amber-400" /> Gaps for this role
              </h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {review.gaps.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          </div>

          {review.keywords.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">Keywords worth adding — if they are true of you</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {review.keywords.map((k) => (
                  <Badge key={k} variant="secondary">
                    {k}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {review.rewrites.length > 0 && (
            <div>
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <Wand2 className="size-4 text-primary" /> Stronger wording
              </h3>
              <ul className="mt-2 space-y-3">
                {review.rewrites.map((r) => (
                  <li key={r.before} className="rounded-xl border p-3 text-sm">
                    <p className="text-muted-foreground line-through decoration-destructive/50">{r.before}</p>
                    <p className="mt-1.5">{r.after}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/resume">Edit my resume</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
