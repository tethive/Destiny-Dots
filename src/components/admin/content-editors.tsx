"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, EnumSelect, Field, PathMultiSelect } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { difficultyLabel, levelLabels, workModeLabels } from "@/lib/labels";
import { deleteContent, saveCertification, saveJob, saveUpdate, type AdminResult } from "@/server/actions/admin";

type PathRef = { slug: string; title: string };

function EditorSheet({
  title,
  description,
  isNew,
  onOpen,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  isNew: boolean;
  onOpen: () => void;
  onSubmit: () => Promise<AdminResult>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) onOpen();
      }}
    >
      <SheetTrigger asChild>
        {isNew ? (
          <Button size="lg" className="rounded-full">
            <Plus /> New
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit">
            <Pencil />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form
          id="content-form"
          className="space-y-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await onSubmit();
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          {children}
        </form>
        <SheetFooter>
          <Button type="submit" form="content-form" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function PublishedSwitch({ value, onChange, label = "Published" }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
      <span className="font-medium">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

/* -------------------------------------------------------------------------- */

export type UpdateValues = { id?: string; title: string; slug: string; excerpt: string; body: string; domainTags: string[]; readMinutes: number; isPublished: boolean };
const emptyUpdate: UpdateValues = { title: "", slug: "", excerpt: "", body: "", domainTags: [], readMinutes: 4, isPublished: false };

export function UpdateEditor({ value }: { value?: UpdateValues }) {
  const [v, setV] = useState(value ?? emptyUpdate);
  return (
    <EditorSheet
      title={value ? "Edit update" : "New tech update"}
      description="Posts are shown to students, prioritised by their domains. Body supports Markdown."
      isNew={!value}
      onOpen={() => setV(value ?? emptyUpdate)}
      onSubmit={() => saveUpdate(value?.id ?? null, v)}
    >
      <Field label="Title">
        <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <Field label="Slug" hint="Blank = from title">
          <Input value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Read time (min)">
          <Input type="number" min={1} value={v.readMinutes} onChange={(e) => setV({ ...v, readMinutes: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Excerpt">
        <Textarea rows={2} value={v.excerpt} onChange={(e) => setV({ ...v, excerpt: e.target.value })} maxLength={300} />
      </Field>
      <Field label="Body (Markdown)">
        <Textarea rows={12} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} className="font-mono text-xs" />
      </Field>
      <Field label="Domains" hint="None = shown to everyone">
        <DomainMultiSelect value={v.domainTags} onChange={(d) => setV({ ...v, domainTags: d })} />
      </Field>
      <PublishedSwitch value={v.isPublished} onChange={(p) => setV({ ...v, isPublished: p })} />
    </EditorSheet>
  );
}

/* -------------------------------------------------------------------------- */

export type JobValues = {
  id?: string;
  title: string;
  company: string;
  location: string;
  workMode: "REMOTE" | "HYBRID" | "ONSITE";
  level: "INTERNSHIP" | "ENTRY" | "MID" | "SENIOR";
  domainTags: string[];
  pathSlugs: string[];
  url: string;
  salary: string;
  description: string;
  expiresAt: string;
  isPublished: boolean;
};
const emptyJob: JobValues = {
  title: "",
  company: "",
  location: "",
  workMode: "HYBRID",
  level: "ENTRY",
  domainTags: [],
  pathSlugs: [],
  url: "",
  salary: "",
  description: "",
  expiresAt: "",
  isPublished: true,
};

export function JobEditor({ value, paths }: { value?: JobValues; paths: PathRef[] }) {
  const [v, setV] = useState(value ?? emptyJob);
  return (
    <EditorSheet
      title={value ? "Edit job" : "New job listing"}
      description="Students apply on the employer's site — paste the application link."
      isNew={!value}
      onOpen={() => setV(value ?? emptyJob)}
      onSubmit={() => saveJob(value?.id ?? null, v)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Job title">
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label="Company">
          <Input value={v.company} onChange={(e) => setV({ ...v, company: e.target.value })} />
        </Field>
        <Field label="Location">
          <Input value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} placeholder="Chennai" />
        </Field>
        <Field label="Salary (optional)">
          <Input value={v.salary} onChange={(e) => setV({ ...v, salary: e.target.value })} placeholder="₹4–6 LPA" />
        </Field>
        <Field label="Work mode">
          <EnumSelect value={v.workMode} onChange={(x) => setV({ ...v, workMode: x as JobValues["workMode"] })} options={workModeLabels} />
        </Field>
        <Field label="Level">
          <EnumSelect value={v.level} onChange={(x) => setV({ ...v, level: x as JobValues["level"] })} options={levelLabels} />
        </Field>
      </div>
      <Field label="Application URL">
        <Input type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" />
      </Field>
      <Field label="Short description">
        <Textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={600} />
      </Field>
      <Field label="Domains">
        <DomainMultiSelect value={v.domainTags} onChange={(d) => setV({ ...v, domainTags: d })} />
      </Field>
      <Field label="Related paths">
        <PathMultiSelect value={v.pathSlugs} onChange={(p) => setV({ ...v, pathSlugs: p })} paths={paths} />
      </Field>
      <Field label="Hide after" hint="Blank = keep until unpublished">
        <Input type="date" value={v.expiresAt} onChange={(e) => setV({ ...v, expiresAt: e.target.value })} />
      </Field>
      <PublishedSwitch value={v.isPublished} onChange={(p) => setV({ ...v, isPublished: p })} />
    </EditorSheet>
  );
}

/* -------------------------------------------------------------------------- */

export type CertValues = {
  id?: string;
  name: string;
  slug: string;
  provider: string;
  domainTags: string[];
  overview: string;
  examFormat: string;
  difficulty: "FOUNDATIONAL" | "ASSOCIATE" | "PROFESSIONAL" | "EXPERT";
  prepTime: string;
  officialUrl: string;
  topics: string;
  pathSlugs: string[];
  isPublished: boolean;
};
const emptyCert: CertValues = {
  name: "",
  slug: "",
  provider: "",
  domainTags: [],
  overview: "",
  examFormat: "",
  difficulty: "ASSOCIATE",
  prepTime: "",
  officialUrl: "",
  topics: "",
  pathSlugs: [],
  isPublished: true,
};

export function CertEditor({ value, paths }: { value?: CertValues; paths: PathRef[] }) {
  const [v, setV] = useState(value ?? emptyCert);
  return (
    <EditorSheet
      title={value ? "Edit certification guide" : "New certification guide"}
      description="Keep exam details accurate — link the official page so students can confirm."
      isNew={!value}
      onOpen={() => setV(value ?? emptyCert)}
      onSubmit={() => saveCertification(value?.id ?? null, v)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Provider">
          <Input value={v.provider} onChange={(e) => setV({ ...v, provider: e.target.value })} />
        </Field>
        <Field label="Slug" hint="Blank = from name">
          <Input value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} className="font-mono" />
        </Field>
        <Field label="Difficulty">
          <EnumSelect value={v.difficulty} onChange={(x) => setV({ ...v, difficulty: x as CertValues["difficulty"] })} options={difficultyLabel} />
        </Field>
        <Field label="Typical prep time">
          <Input value={v.prepTime} onChange={(e) => setV({ ...v, prepTime: e.target.value })} placeholder="2–3 months part-time" />
        </Field>
        <Field label="Official URL">
          <Input type="url" value={v.officialUrl} onChange={(e) => setV({ ...v, officialUrl: e.target.value })} />
        </Field>
      </div>
      <Field label="Overview">
        <Textarea rows={3} value={v.overview} onChange={(e) => setV({ ...v, overview: e.target.value })} />
      </Field>
      <Field label="Exam format">
        <Textarea rows={3} value={v.examFormat} onChange={(e) => setV({ ...v, examFormat: e.target.value })} />
      </Field>
      <Field label="Topics" hint="One per line">
        <Textarea rows={4} value={v.topics} onChange={(e) => setV({ ...v, topics: e.target.value })} />
      </Field>
      <Field label="Domains">
        <DomainMultiSelect value={v.domainTags} onChange={(d) => setV({ ...v, domainTags: d })} />
      </Field>
      <Field label="Paths that prepare for it">
        <PathMultiSelect value={v.pathSlugs} onChange={(p) => setV({ ...v, pathSlugs: p })} paths={paths} />
      </Field>
      <PublishedSwitch value={v.isPublished} onChange={(p) => setV({ ...v, isPublished: p })} />
    </EditorSheet>
  );
}

/* -------------------------------------------------------------------------- */

export function DeleteContentButton({ kind, id, label }: { kind: "update" | "job" | "cert"; id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Delete ${label}`}
      disabled={pending}
      className="hover:text-destructive"
      onClick={() =>
        confirm(`Delete "${label}"? This can't be undone.`) &&
        start(async () => {
          const res = await deleteContent(kind, id);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
