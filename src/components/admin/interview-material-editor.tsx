"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, EnumSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteInterviewMaterial, saveInterviewMaterial } from "@/server/actions/admin";

export type MaterialValues = {
  id?: string;
  round: "APTITUDE" | "TECHNICAL" | "CODING";
  kind: "VIDEO" | "DOC" | "PRACTICE" | "LINK";
  title: string;
  description: string;
  source: string;
  url: string;
  domainTags: string[];
  order: number;
  isActive: boolean;
};

const empty: MaterialValues = {
  round: "APTITUDE",
  kind: "LINK",
  title: "",
  description: "",
  source: "",
  url: "",
  domainTags: [],
  order: 0,
  isActive: true,
};

const rounds = { APTITUDE: "Aptitude", TECHNICAL: "Technical", CODING: "Coding" };
const kinds = { VIDEO: "Video", DOC: "Notes / PDF", PRACTICE: "Practice set", LINK: "Guide" };

export function InterviewMaterialEditor({ value }: { value?: MaterialValues }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(value ?? empty);
  const [pending, start] = useTransition();
  const router = useRouter();

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
          <Button variant="ghost" size="icon" aria-label="Edit material">
            <Pencil />
          </Button>
        ) : (
          <Button variant="outline" size="lg" className="rounded-full">
            <Plus /> Add material
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{value ? "Edit study material" : "Add study material"}</SheetTitle>
          <SheetDescription>
            Link to the source rather than re-hosting it. YouTube links play inside the app; everything else opens in a new tab with the credit intact.
          </SheetDescription>
        </SheetHeader>
        <form
          id="material-form"
          className="space-y-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveInterviewMaterial(value?.id ?? null, {
                ...v,
                description: v.description || undefined,
                source: v.source || undefined,
              });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-3 gap-3">
            <Field label="Round">
              <EnumSelect value={v.round} onChange={(round) => setV({ ...v, round: round as MaterialValues["round"] })} options={rounds} />
            </Field>
            <Field label="Type">
              <EnumSelect value={v.kind} onChange={(kind) => setV({ ...v, kind: kind as MaterialValues["kind"] })} options={kinds} />
            </Field>
            <Field label="Order" hint="Lower first">
              <Input type="number" min={0} value={v.order} onChange={(e) => setV({ ...v, order: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Title">
            <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Striver SDE Sheet — top coding interview problems" />
          </Field>

          <Field label="Link">
            <Input value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://…" className="font-mono text-xs" />
          </Field>

          <Field label="Credit" hint="Who made it — shown to students">
            <Input value={v.source} onChange={(e) => setV({ ...v, source: e.target.value })} placeholder="CareerRide" />
          </Field>

          <Field label="Description" hint="One line on what it covers">
            <Textarea rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} maxLength={400} />
          </Field>

          <Field label="Roles" hint="Empty = shown for every role">
            <DomainMultiSelect value={v.domainTags} onChange={(domainTags) => setV({ ...v, domainTags })} />
          </Field>

          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span className="font-medium">Shown to students</span>
            <Switch checked={v.isActive} onCheckedChange={(isActive) => setV({ ...v, isActive })} />
          </label>
        </form>
        <SheetFooter>
          <Button type="submit" form="material-form" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function DeleteMaterialButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Remove material"
      disabled={pending}
      onClick={() => {
        if (!confirm(`Remove “${title}” from the prep area?`)) return;
        start(async () => {
          const res = await deleteInterviewMaterial(id);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <Trash2 className="text-destructive" />
    </Button>
  );
}
