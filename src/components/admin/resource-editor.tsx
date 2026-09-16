"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LinkIcon, LoaderCircle, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect, EnumSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useUpload } from "@/components/uploads/use-upload";
import { presentResource } from "@/lib/embed";
import { checkResourceLinks, deleteResource, saveResource } from "@/server/actions/admin";

type ResourceValues = {
  id?: string;
  title: string;
  url: string;
  type: "VIDEO" | "DOC" | "PROJECT" | "QUIZ" | "LINK";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  file: { key: string; name: string; mime: string } | null;
  duration: string;
  isPremium: boolean;
  domainTags: string[];
  topics: string;
};

const empty: ResourceValues = { title: "", url: "", type: "VIDEO", level: "BEGINNER", file: null, duration: "", isPremium: false, domainTags: [], topics: "" };

const presentationLabel: Record<string, string> = {
  "video-embed": "Plays inside the app",
  "doc-embed": "Opens inside the app",
  pdf: "PDF reader inside the app",
  image: "Image viewer inside the app",
  "video-file": "Video player inside the app",
  page: "Opens inside the app",
  external: "Opens in a new tab if the site blocks embedding (checked on save)",
};

export function ResourceSheet({ resource, trigger }: { resource?: ResourceValues; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<ResourceValues>(resource ?? empty);
  const [pending, start] = useTransition();
  const router = useRouter();
  const { upload, progress } = useUpload();
  const shown = presentResource({ url: v.url, fileKey: v.file?.key, fileMime: v.file?.mime, embeddable: false });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setV(resource ?? empty);
      }}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full">
            <Plus /> Add resource
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{resource ? "Edit resource" : "Add resource"}</SheetTitle>
          <SheetDescription>Resources live in one library and can be reused across dots.</SheetDescription>
        </SheetHeader>
        <form
          id="resource-form"
          className="space-y-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveResource(resource?.id ?? null, v);
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <Field label="Title">
            <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
          </Field>
          <Field label="Link" hint="YouTube, Vimeo, Loom, Google Docs/Slides/Drive and many sites play inside the app">
            <Input type="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://" disabled={Boolean(v.file)} />
          </Field>
          <Field label="…or upload a file" hint="PDF, image or MP4 up to 50 MB. Students view it in the app; no download button.">
            {v.file ? (
              <div className="flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-sm">
                <FileUp className="size-4 text-primary" />
                <span className="min-w-0 flex-1 truncate">{v.file.name}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => setV({ ...v, file: null })}>
                  <X />
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground hover:bg-muted/40">
                {progress !== null ? <LoaderCircle className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {progress !== null ? `Uploading… ${progress}%` : "Choose a file"}
                <input
                  type="file"
                  className="sr-only"
                  accept="application/pdf,image/png,image/jpeg,image/webp,video/mp4"
                  disabled={progress !== null}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      const up = await upload(file, "resource");
                      setV((cur) => ({ ...cur, url: "", file: { key: up.key, name: up.name, mime: up.mime }, title: cur.title || file.name.replace(/.[^.]+$/, "") }));
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Upload failed");
                    }
                  }}
                />
              </label>
            )}
          </Field>
          {(v.url || v.file) && <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">{presentationLabel[shown.kind]}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <EnumSelect value={v.type} onChange={(t) => setV({ ...v, type: t as ResourceValues["type"] })} options={{ VIDEO: "Video", DOC: "Doc", PROJECT: "Project", QUIZ: "Quiz", LINK: "Link" }} />
            </Field>
            <Field label="Level">
              <EnumSelect value={v.level} onChange={(t) => setV({ ...v, level: t as ResourceValues["level"] })} options={{ BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" }} />
            </Field>
            <Field label="Duration">
              <Input value={v.duration} onChange={(e) => setV({ ...v, duration: e.target.value })} placeholder="1h 30m" />
            </Field>
          </div>
          <Field label="Domains">
            <DomainMultiSelect value={v.domainTags} onChange={(d) => setV({ ...v, domainTags: d })} />
          </Field>
          <Field label="Topics" hint="Comma-separated tags">
            <Input value={v.topics} onChange={(e) => setV({ ...v, topics: e.target.value })} placeholder="SQL, joins" />
          </Field>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
            <span>
              <span className="font-medium">Premium</span>
              <span className="block text-muted-foreground">Requires Pro or an unlock, even inside a free dot</span>
            </span>
            <Switch checked={v.isPremium} onCheckedChange={(p) => setV({ ...v, isPremium: p })} />
          </label>
        </form>
        <SheetFooter>
          <Button type="submit" form="resource-form" disabled={pending}>
            {pending && <LoaderCircle className="animate-spin" />} Save resource
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ResourceRowActions({ resource }: { resource: Required<Pick<ResourceValues, "id">> & ResourceValues }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [editOpenKey, setEditOpenKey] = useState(0);
  return (
    <div className="flex items-center justify-end gap-1">
      <ResourceSheet
        key={editOpenKey}
        resource={resource}
        trigger={
          <Button variant="ghost" size="icon" aria-label="Edit resource">
            <Pencil />
          </Button>
        }
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="More actions" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              start(async () => {
                const res = await checkResourceLinks([resource.id]);
                if (res.ok) toast.success(res.message);
                router.refresh();
                setEditOpenKey((k) => k + 1);
              })
            }
          >
            <LinkIcon /> Check link
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() =>
              start(async () => {
                if (!confirm(`Delete "${resource.title}"? It will be removed from every dot.`)) return;
                const res = await deleteResource(resource.id);
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
                router.refresh();
              })
            }
          >
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function LinkCheckButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="lg"
      className="rounded-full"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await checkResourceLinks();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <LinkIcon />} Check 40 oldest links
    </Button>
  );
}
