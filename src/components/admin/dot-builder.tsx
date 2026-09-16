"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Award, GripVertical, Library, ListChecks, LoaderCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { deleteDot, reorderDots, saveDot, setDotQuestions, setDotResources, setPathPublished } from "@/server/actions/admin";

export type BuilderDot = {
  id: string;
  order: number;
  title: string;
  description: string;
  hours: number;
  isFree: boolean;
  certification: string | null;
  resourceIds: string[];
  questions: { prompt: string; options: string[]; answerIndex: number; explanation: string | null }[];
};
export type LibraryResource = { id: string; title: string; type: string; domainTags: string[]; isPremium: boolean };

export function PublishToggle({ pathId, isPublished }: { pathId: string; isPublished: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <label className="flex items-center gap-3 rounded-full border bg-card py-1.5 pr-4 pl-2 text-sm">
      <Switch
        checked={isPublished}
        disabled={pending}
        onCheckedChange={(v) =>
          start(async () => {
            const res = await setPathPublished(pathId, v);
            if (res.ok) toast.success(res.message);
            else toast.error(res.error);
            router.refresh();
          })
        }
      />
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : isPublished ? "Published" : "Draft"}
    </label>
  );
}

export function DotBuilder({ pathId, dots: initial, library }: { pathId: string; dots: BuilderDot[]; library: LibraryResource[] }) {
  const router = useRouter();
  const [dots, setDots] = useState(initial);
  const [editing, setEditing] = useState<BuilderDot | "new" | null>(null);
  const [picking, setPicking] = useState<BuilderDot | null>(null);
  const [quizzing, setQuizzing] = useState<BuilderDot | null>(null);
  const [pending, start] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // Keep local order in sync when the server sends fresh data.
  const signature = initial.map((d) => `${d.id}:${d.order}:${d.title}:${d.isFree}:${d.resourceIds.length}:${d.questions.length}`).join("|");
  const [seen, setSeen] = useState(signature);
  if (seen !== signature) {
    setSeen(signature);
    setDots(initial);
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = dots.findIndex((d) => d.id === e.active.id);
    const to = dots.findIndex((d) => d.id === e.over!.id);
    const next = arrayMove(dots, from, to);
    setDots(next);
    start(async () => {
      const res = await reorderDots(pathId, next.map((d) => d.id));
      if (!res.ok) {
        toast.error(res.error);
        setDots(dots);
      } else toast.success(res.message);
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Dots</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder. Free dots are open to every signed-in student.</p>
        </div>
        <div className="flex items-center gap-2">
          {pending && <LoaderCircle className="size-4 animate-spin text-muted-foreground" />}
          <Button size="lg" className="rounded-full" onClick={() => setEditing("new")}>
            <Plus /> Add dot
          </Button>
        </div>
      </div>

      {dots.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No dots yet — add the first milestone.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={dots.map((d) => d.id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {dots.map((d, i) => (
                <SortableDot
                  key={d.id}
                  dot={d}
                  index={i}
                  onEdit={() => setEditing(d)}
                  onResources={() => setPicking(d)}
                  onQuiz={() => setQuizzing(d)}
                  onDelete={() =>
                    start(async () => {
                      if (!confirm(`Delete "${d.title}"? Student progress on this dot will be removed.`)) return;
                      const res = await deleteDot(d.id);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                      router.refresh();
                    })
                  }
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <DotDialog pathId={pathId} dot={editing} onClose={() => setEditing(null)} />
      <ResourcePicker dot={picking} library={library} onClose={() => setPicking(null)} />
      <QuizEditor dot={quizzing} onClose={() => setQuizzing(null)} />
    </section>
  );
}

function SortableDot({
  dot,
  index,
  onEdit,
  onResources,
  onQuiz,
  onDelete,
}: {
  dot: BuilderDot;
  index: number;
  onEdit: () => void;
  onResources: () => void;
  onQuiz: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dot.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("flex items-center gap-2 rounded-xl border bg-background p-2.5 sm:gap-3", isDragging && "z-10 shadow-xl ring-2 ring-primary/30")}
    >
      <button type="button" className="cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing" aria-label={`Drag ${dot.title}`} {...attributes} {...listeners}>
        <GripVertical className="size-4" />
      </button>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-semibold">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{dot.title}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {dot.isFree ? <Badge variant="secondary">Free</Badge> : <Badge variant="outline">Locked</Badge>}
          <span>{dot.hours}h</span>·<span>{dot.resourceIds.length} resources</span>·<span>{dot.questions.length} questions</span>
          {dot.certification && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Award className="size-3" /> {dot.certification}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center">
        <Button variant="ghost" size="icon" onClick={onResources} aria-label="Resources">
          <Library />
        </Button>
        <Button variant="ghost" size="icon" onClick={onQuiz} aria-label="Checkpoint">
          <ListChecks />
        </Button>
        <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Edit">
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="Delete" className="hover:text-destructive">
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function DotDialog({ pathId, dot, onClose }: { pathId: string; dot: BuilderDot | "new" | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const existing = dot && dot !== "new" ? dot : null;
  const [form, setForm] = useState({ title: "", description: "", hours: 8, isFree: false, certification: "" });
  const key = dot === "new" ? "new" : existing?.id;
  const [loaded, setLoaded] = useState<string | undefined>();
  if (dot && loaded !== key) {
    setLoaded(key);
    setForm(
      existing
        ? { title: existing.title, description: existing.description, hours: existing.hours, isFree: existing.isFree, certification: existing.certification ?? "" }
        : { title: "", description: "", hours: 8, isFree: false, certification: "" },
    );
  }

  return (
    <Dialog open={dot !== null} onOpenChange={(o) => !o && (onClose(), setLoaded(undefined))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit dot" : "Add dot"}</DialogTitle>
          <DialogDescription>A dot is one milestone with its own resources and optional checkpoint.</DialogDescription>
        </DialogHeader>
        <form
          id="dot-form"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveDot(pathId, existing?.id ?? null, form);
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              onClose();
              setLoaded(undefined);
              router.refresh();
            });
          }}
        >
          <Field label="Title">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated hours">
              <Input type="number" min={1} value={form.hours} onChange={(e) => setForm({ ...form, hours: Number(e.target.value) })} />
            </Field>
            <Field label="Certification (optional)">
              <Input value={form.certification} onChange={(e) => setForm({ ...form, certification: e.target.value })} placeholder="AWS SAA-C03" />
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span>
              <span className="font-medium">Free dot</span>
              <span className="block text-muted-foreground">Open to all signed-in students without payment</span>
            </span>
            <Switch checked={form.isFree} onCheckedChange={(v) => setForm({ ...form, isFree: v })} />
          </label>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="dot-form" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />} Save dot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResourcePicker({ dot, library, onClose }: { dot: BuilderDot | null; library: LibraryResource[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState<string | undefined>();
  if (dot && loaded !== dot.id) {
    setLoaded(dot.id);
    setSelected(dot.resourceIds);
    setQ("");
  }
  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const list = term ? library.filter((r) => r.title.toLowerCase().includes(term)) : library;
    // Selected first, in their saved order.
    return [...selected.map((id) => list.find((r) => r.id === id)).filter(Boolean), ...list.filter((r) => !selected.includes(r.id))] as LibraryResource[];
  }, [library, q, selected]);

  return (
    <Dialog open={dot !== null} onOpenChange={(o) => !o && (onClose(), setLoaded(undefined))}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Resources for “{dot?.title}”</DialogTitle>
          <DialogDescription>Pick from the shared resource library. Order follows the order you select them in.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library" className="pl-9" />
        </div>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.slice(0, 200).map((r) => {
            const idx = selected.indexOf(r.id);
            return (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted">
                  <Checkbox
                    checked={idx >= 0}
                    onCheckedChange={(v) => setSelected((cur) => (v ? [...cur, r.id] : cur.filter((x) => x !== r.id)))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {r.type}
                      {r.isPremium && " · premium"}
                    </span>
                  </span>
                  {idx >= 0 && <span className="font-mono text-xs text-primary">#{idx + 1}</span>}
                </label>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <p className="mr-auto self-center text-sm text-muted-foreground">{selected.length} selected</p>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setDotResources(dot!.id, selected);
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                onClose();
                setLoaded(undefined);
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Save resources
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Q = { prompt: string; options: string[]; answerIndex: number; explanation: string };

function QuizEditor({ dot, onClose }: { dot: BuilderDot | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loaded, setLoaded] = useState<string | undefined>();
  if (dot && loaded !== dot.id) {
    setLoaded(dot.id);
    setQuestions(dot.questions.map((q) => ({ ...q, explanation: q.explanation ?? "" })));
  }
  const update = (i: number, patch: Partial<Q>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <Dialog open={dot !== null} onOpenChange={(o) => !o && (onClose(), setLoaded(undefined))}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Checkpoint for “{dot?.title}”</DialogTitle>
          <DialogDescription>Students pass with 70% or more. Leave empty for a self-check dot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-start gap-2">
                <span className="mt-2 font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <Textarea rows={2} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} placeholder="Question" />
                <Button variant="ghost" size="icon" aria-label="Remove question" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
              <div className="space-y-2 pl-5">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`answer-${i}`}
                      aria-label={`Mark option ${oi + 1} correct`}
                      checked={q.answerIndex === oi}
                      onChange={() => update(i, { answerIndex: oi })}
                      className="accent-[var(--primary)]"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => update(i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })}
                      placeholder={`Option ${oi + 1}`}
                    />
                    {q.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove option"
                        onClick={() =>
                          update(i, {
                            options: q.options.filter((_, k) => k !== oi),
                            answerIndex: q.answerIndex >= oi && q.answerIndex > 0 ? q.answerIndex - 1 : q.answerIndex,
                          })
                        }
                      >
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                ))}
                {q.options.length < 6 && (
                  <Button variant="ghost" size="sm" onClick={() => update(i, { options: [...q.options, ""] })}>
                    <Plus /> Option
                  </Button>
                )}
                <Input value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} placeholder="Explanation shown after submitting (optional)" />
              </div>
            </div>
          ))}
          <Button variant="outline" className="rounded-full" onClick={() => setQuestions((qs) => [...qs, { prompt: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }])}>
            <Plus /> Add question
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setDotQuestions(dot!.id, questions);
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                onClose();
                setLoaded(undefined);
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Save checkpoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
