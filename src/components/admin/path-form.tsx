"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, EnumSelect, Field, domainOptions, levelOptions } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { savePath } from "@/server/actions/admin";

export type PathFormValues = {
  title: string;
  slug: string;
  domainTag: string;
  summary: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: string;
  roles: string;
  outcomes: string;
};

export function PathForm({ id, initial }: { id: string | null; initial: PathFormValues }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof PathFormValues>(k: K, val: PathFormValues[K]) => setV((s) => ({ ...s, [k]: val }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePath(id, v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          if (!id && res.id) router.push(`/admin/paths/${res.id}`);
          else router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Data Analyst" />
        </Field>
        <Field label="URL slug" hint="Leave blank to generate from the title">
          <Input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder="data-analyst" className="font-mono" />
        </Field>
        <Field label="Domain">
          <EnumSelect value={v.domainTag} onChange={(x) => set("domainTag", x)} options={domainOptions} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Level">
            <EnumSelect value={v.level} onChange={(x) => set("level", x as PathFormValues["level"])} options={levelOptions} />
          </Field>
          <Field label="Duration">
            <Input value={v.duration} onChange={(e) => set("duration", e.target.value)} placeholder="4–6 months" />
          </Field>
        </div>
      </div>
      <Field label="Summary">
        <Textarea rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Roles it leads to" hint="Comma-separated">
          <Input value={v.roles} onChange={(e) => set("roles", e.target.value)} placeholder="Data Analyst, MIS Analyst" />
        </Field>
        <Field label="Outcomes" hint="One per line">
          <Textarea rows={3} value={v.outcomes} onChange={(e) => set("outcomes", e.target.value)} />
        </Field>
      </div>
      <Button type="submit" size="lg" className="rounded-full px-5" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} {id ? "Save path" : "Create path"}
      </Button>
    </form>
  );
}

// Re-exported for content forms that need the domain chips.
export { DomainMultiSelect };
