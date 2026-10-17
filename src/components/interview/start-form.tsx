"use client";

import { useState, useTransition } from "react";
import { Brain, Code2, FileUser, LoaderCircle, Mic, Play, Sigma } from "lucide-react";
import { toast } from "sonner";
import { DomainIcon } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { domains } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { startInterview } from "@/server/actions/interview";

export type RoundOption = {
  key: "APTITUDE" | "TECHNICAL" | "CODING";
  label: string;
  blurb: string;
  questions: number;
  minutes: number;
  needsDomain: boolean;
  available: number;
};

const icons = { APTITUDE: Sigma, TECHNICAL: Brain, CODING: Code2 };
const levels = [
  { value: "BEGINNER", label: "Fresher — campus and entry level" },
  { value: "INTERMEDIATE", label: "1–3 years — working professional" },
  { value: "ADVANCED", label: "Senior — deep dives and trade-offs" },
];

export function StartInterviewForm({ rounds, defaultDomain, hasResume = false }: { rounds: RoundOption[]; defaultDomain?: string; hasResume?: boolean }) {
  const [round, setRound] = useState<RoundOption>(rounds[0]);
  const [level, setLevel] = useState("BEGINNER");
  const [domain, setDomain] = useState(defaultDomain ?? domains[0].tag);
  const [voice, setVoice] = useState(false);
  const [useResume, setUseResume] = useState(false);
  const [pending, start] = useTransition();

  const go = () =>
    start(async () => {
      const res = await startInterview({
        round: round.key,
        level: level as "BEGINNER",
        domainTag: round.needsDomain ? domain : undefined,
        mode: voice && round.key === "TECHNICAL" ? "VOICE" : "TEXT",
        useResume: useResume && round.key === "TECHNICAL",
      });
      // A successful start redirects, so anything returned here is a problem.
      if (res && !res.ok) toast.error(res.error);
    });

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="font-semibold">Start a mock interview</h2>
      <p className="mt-1 text-sm text-muted-foreground">Pick a round, answer as you would in the real thing, and get a scored report at the end.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {rounds.map((r) => {
          const Icon = icons[r.key];
          const selected = r.key === round.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setRound(r)}
              aria-pressed={selected}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                <Icon className="size-4 text-primary" /> {r.label}
              </span>
              <span className="text-xs text-muted-foreground">{r.blurb}</span>
              <span className="mt-auto pt-2 text-xs font-medium text-muted-foreground">
                {r.questions} questions · {r.minutes} min
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium">Your level</span>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        {round.needsDomain && (
          <label className="space-y-1.5">
            <span className="text-sm font-medium">Role you&apos;re interviewing for</span>
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
        )}
      </div>

      {round.key === "TECHNICAL" && (
        <label className="mt-4 flex items-start justify-between gap-4 rounded-xl border p-4">
          <span>
            <span className="flex items-center gap-2 font-medium">
              <Mic className="size-4 text-primary" /> Speak your answers
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              The interviewer reads each question aloud and you answer out loud, with your camera on if you want to practise eye contact. Needs Chrome,
              Edge or Safari; nothing is recorded.
            </span>
          </span>
          <Switch checked={voice} onCheckedChange={setVoice} aria-label="Speak your answers" />
        </label>
      )}

      {round.key === "TECHNICAL" && hasResume && (
        <label className="mt-3 flex items-start justify-between gap-4 rounded-xl border p-4">
          <span>
            <span className="flex items-center gap-2 font-medium">
              <FileUser className="size-4 text-primary" /> Ask about my resume
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              Starts with two questions about your own projects and claims, then moves to the standard role questions.
            </span>
          </span>
          <Switch checked={useResume} onCheckedChange={setUseResume} aria-label="Ask about my resume" />
        </label>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="lg" className="rounded-full" disabled={pending || round.available < 2} onClick={go}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Play />} Start {voice && round.key === "TECHNICAL" ? "voice" : round.label.toLowerCase()} round
        </Button>
        {round.available < 2 && <p className="text-sm text-muted-foreground">No questions in this round yet — try another one.</p>}
      </div>
    </section>
  );
}
