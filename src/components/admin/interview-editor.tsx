"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, EnumSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { skillLevelLabels } from "@/lib/labels";
import { deleteInterviewQuestion, saveInterviewQuestion, setInterviewQuestionActive } from "@/server/actions/admin";

export type QuestionValues = {
  id?: string;
  round: "APTITUDE" | "TECHNICAL" | "CODING";
  kind: "MCQ" | "SHORT_ANSWER" | "CODING";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  topic: string;
  prompt: string;
  domainTags: string[];
  options: string[];
  answerIndex: number | null;
  modelAnswer: string;
  explanation: string;
  starterCode: string;
  language: string;
  hints: string[];
  minutes: number;
  isActive: boolean;
};

const empty: QuestionValues = {
  round: "APTITUDE",
  kind: "MCQ",
  level: "BEGINNER",
  topic: "",
  prompt: "",
  domainTags: [],
  options: ["", "", "", ""],
  answerIndex: 0,
  modelAnswer: "",
  explanation: "",
  starterCode: "",
  language: "",
  hints: [],
  minutes: 3,
  isActive: true,
};

const rounds = { APTITUDE: "Aptitude", TECHNICAL: "Technical", CODING: "Coding" };
const kinds = { MCQ: "Multiple choice", SHORT_ANSWER: "Short answer", CODING: "Coding" };

export function InterviewQuestionEditor({ value }: { value?: QuestionValues }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value ?? empty);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = () =>
    start(async () => {
      const res = await saveInterviewQuestion(value?.id ?? null, {
        ...v,
        modelAnswer: v.modelAnswer || undefined,
        explanation: v.explanation || undefined,
        starterCode: v.starterCode || undefined,
        language: v.language || undefined,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setOpen(false);
      router.refresh();
    });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setV(value ?? empty);
      }}
    >
      <SheetTrigger asChild>
        {value ? (
          <Button variant="ghost" size="icon" aria-label="Edit question">
            <Pencil />
          </Button>
        ) : (
          <Button size="lg" className="rounded-full">
            <Plus /> New question
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{value ? "Edit question" : "New interview question"}</SheetTitle>
          <SheetDescription>Questions feed both the practice bank and the AI mock interviews.</SheetDescription>
        </SheetHeader>
        <form
          id="interview-question-form"
          className="space-y-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Round">
              <EnumSelect
                value={v.round}
                onChange={(round) =>
                  setV({
                    ...v,
                    round: round as QuestionValues["round"],
                    // Each round has a natural answer format.
                    kind: round === "APTITUDE" ? "MCQ" : round === "CODING" ? "CODING" : "SHORT_ANSWER",
                  })
                }
                options={rounds}
              />
            </Field>
            <Field label="Answer type">
              <EnumSelect value={v.kind} onChange={(kind) => setV({ ...v, kind: kind as QuestionValues["kind"] })} options={kinds} />
            </Field>
            <Field label="Level">
              <EnumSelect value={v.level} onChange={(level) => setV({ ...v, level: level as QuestionValues["level"] })} options={skillLevelLabels} />
            </Field>
          </div>

          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <Field label="Topic" hint="Shown above the question, e.g. “Time & work”">
              <Input value={v.topic} onChange={(e) => setV({ ...v, topic: e.target.value })} />
            </Field>
            <Field label="Minutes">
              <Input type="number" min={1} max={60} value={v.minutes} onChange={(e) => setV({ ...v, minutes: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Question">
            <Textarea rows={4} value={v.prompt} onChange={(e) => setV({ ...v, prompt: e.target.value })} />
          </Field>

          <Field label="Roles" hint="Aptitude questions usually apply to every role — leave empty">
            <DomainMultiSelect value={v.domainTags} onChange={(domainTags) => setV({ ...v, domainTags })} />
          </Field>

          {v.kind === "MCQ" ? (
            <>
              <Field label="Options" hint="Pick the radio button next to the correct one">
                <div className="space-y-2">
                  {v.options.map((option, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="answerIndex"
                        checked={v.answerIndex === i}
                        onChange={() => setV({ ...v, answerIndex: i })}
                        aria-label={`Option ${String.fromCharCode(65 + i)} is correct`}
                        className="size-4 accent-[var(--primary)]"
                      />
                      <Input
                        value={option}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        onChange={(e) => setV({ ...v, options: v.options.map((o, j) => (j === i ? e.target.value : o)) })}
                      />
                    </div>
                  ))}
                </div>
              </Field>
              <Field label="Explanation" hint="Shown after answering">
                <Textarea rows={3} value={v.explanation} onChange={(e) => setV({ ...v, explanation: e.target.value })} />
              </Field>
            </>
          ) : (
            <>
              <Field label="Model answer" hint="What a strong answer covers — the AI grades against this">
                <Textarea rows={6} value={v.modelAnswer} onChange={(e) => setV({ ...v, modelAnswer: e.target.value })} />
              </Field>
              {v.kind === "CODING" && (
                <div className="grid grid-cols-[1fr_2fr] gap-3">
                  <Field label="Language" hint="e.g. Python">
                    <Input value={v.language} onChange={(e) => setV({ ...v, language: e.target.value })} />
                  </Field>
                  <Field label="Starter code">
                    <Textarea rows={4} value={v.starterCode} onChange={(e) => setV({ ...v, starterCode: e.target.value })} className="font-mono text-xs" />
                  </Field>
                </div>
              )}
              <Field label="Hints" hint="One per line — students can reveal these before answering">
                <Textarea
                  rows={3}
                  value={v.hints.join("\n")}
                  onChange={(e) => setV({ ...v, hints: e.target.value.split("\n") })}
                />
              </Field>
            </>
          )}

          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span className="font-medium">In rotation</span>
            <Switch checked={v.isActive} onCheckedChange={(isActive) => setV({ ...v, isActive })} />
          </label>
        </form>
        <SheetFooter>
          <Button type="submit" form="interview-question-form" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function QuestionRowActions({ id, isActive, topic }: { id: string; isActive: boolean; topic: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    });

  return (
    <span className="flex items-center justify-end">
      <Button
        variant="ghost"
        size="icon"
        aria-label={isActive ? "Retire question" : "Put back in rotation"}
        disabled={pending}
        onClick={() => run(() => setInterviewQuestionActive(id, !isActive))}
      >
        <Power className={isActive ? "text-success" : "text-muted-foreground"} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete question"
        disabled={pending}
        onClick={() => {
          if (confirm(`Delete “${topic}”? Past interviews keep their copy of the question.`)) run(() => deleteInterviewQuestion(id));
        }}
      >
        <Trash2 className="text-destructive" />
      </Button>
    </span>
  );
}
