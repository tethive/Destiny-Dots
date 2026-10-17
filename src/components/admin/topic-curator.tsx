"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, LoaderCircle, Plus, Search, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpload } from "@/components/uploads/use-upload";
import { cn } from "@/lib/utils";
import { saveResource } from "@/server/actions/admin";
import { importResourceCsv, previewResourceCsv, setTopicResources, type CsvPreview } from "@/server/actions/curriculum";

export type LibraryResource = { id: string; title: string; type: string; url: string; isPremium: boolean };

export type CuratorTopic = {
  topicKey: string;
  title: string;
  dotCount: number;
  resources: LibraryResource[];
};

const RESOURCE_KINDS = ["VIDEO", "DOC", "PROJECT", "QUIZ", "LINK"] as const;
type ResourceKind = (typeof RESOURCE_KINDS)[number];

const typeLabel = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

/* -------------------------------------------------------------------------- */
/* One topic                                                                   */
/* -------------------------------------------------------------------------- */

export function TopicRow({ topic, library }: { topic: CuratorTopic; library: LibraryResource[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
        <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{topic.topicKey}</span>
        <span className="min-w-0 flex-1 truncate text-sm">{topic.title}</span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {topic.dotCount} {topic.dotCount === 1 ? "path" : "paths"}
        </span>
        <Badge variant={topic.resources.length ? "secondary" : "outline"} className="shrink-0">
          {topic.resources.length || "none"}
        </Badge>
        <Button size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => setOpen(true)}>
          Curate
        </Button>
      </div>
      {open && <TopicDialog topic={topic} library={library} onClose={() => setOpen(false)} />}
    </>
  );
}

function TopicDialog({ topic, library, onClose }: { topic: CuratorTopic; library: LibraryResource[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string[]>(topic.resources.map((r) => r.id));
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  const known = useMemo(() => {
    const map = new Map(library.map((r) => [r.id, r]));
    for (const r of topic.resources) map.set(r.id, r);
    return map;
  }, [library, topic.resources]);

  const listed = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = [...known.values()];
    const hits = term ? all.filter((r) => r.title.toLowerCase().includes(term)) : all;
    // Chosen first, in save order, so the dialog shows what students will see.
    return [...selected.map((id) => known.get(id)).filter(Boolean), ...hits.filter((r) => !selected.includes(r.id))] as LibraryResource[];
  }, [known, q, selected]);

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const save = () =>
    start(async () => {
      const res = await setTopicResources(topic.topicKey, selected);
      if (res.ok) {
        toast.success(res.message ?? "Saved");
        router.refresh();
        onClose();
      } else toast.error(res.error);
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{topic.title}</DialogTitle>
          <DialogDescription>
            <span className="font-mono text-xs">{topic.topicKey}</span> · saving writes these resources to all{" "}
            {topic.dotCount} {topic.dotCount === 1 ? "path" : "paths"} that teach this topic.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the resource library" className="pl-9" />
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => setAdding(true)}>
            <Plus /> New resource
          </Button>
        </div>

        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {listed.slice(0, 200).map((r) => {
            const on = selected.includes(r.id);
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors",
                    on ? "border-primary bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded border", on && "bg-primary text-primary-foreground")}>
                    {on && <Check className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.url}</span>
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {typeLabel(r.type)}
                  </Badge>
                </button>
              </li>
            );
          })}
          {!listed.length && <li className="py-8 text-center text-sm text-muted-foreground">Nothing matches. Add a new link instead.</li>}
        </ul>

        <DialogFooter className="items-center sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {selected.length} selected · {selected.length * topic.dotCount} dot links
          </span>
          <span className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={pending} className="rounded-full">
              {pending && <LoaderCircle className="animate-spin" />} Save
            </Button>
          </span>
        </DialogFooter>

        {adding && (
          <QuickLink
            onClose={() => setAdding(false)}
            onCreated={(id) => {
              setSelected((cur) => [...cur, id]);
              setAdding(false);
              router.refresh();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Add a link or upload a document without leaving the topic. */
function QuickLink({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<ResourceKind>("VIDEO");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<{ key: string; name: string; mime: string } | null>(null);
  const { upload, progress } = useUpload();

  const pick = async (chosen: File) => {
    try {
      const up = await upload(chosen, "resource");
      setFile({ key: up.key, name: up.name, mime: up.mime });
      setUrl("");
      // A document is the common case for an upload, and the title is usually the filename.
      setType((cur) => (cur === "VIDEO" && !chosen.type.startsWith("video/") ? "DOC" : cur));
      setTitle((cur) => cur || chosen.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const submit = () =>
    start(async () => {
      const res = await saveResource(null, { title, url, type, duration, isPremium: false, domainTags: [], topics: "", level: "BEGINNER", file });
      if (res.ok && res.id) {
        toast.success("Resource added");
        onCreated(res.id);
      } else toast.error("error" in res ? res.error : "Could not add that resource");
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New resource</DialogTitle>
          <DialogDescription>It joins the shared library, so other topics can use it too.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ql-title">Title</Label>
            <Input id="ql-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Networking basics — ARP explained" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ql-url">Link</Label>
            <Input id="ql-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" disabled={Boolean(file)} />
          </div>
          <div className="space-y-1.5">
            <Label>…or upload a document</Label>
            {file ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove file" onClick={() => setFile(null)}>
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full rounded-lg" asChild>
                <label>
                  <Upload /> {progress !== null ? `Uploading… ${progress}%` : "Choose a PDF, image or MP4"}
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const chosen = e.target.files?.[0];
                      e.target.value = "";
                      if (chosen) void pick(chosen);
                    }}
                  />
                </label>
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Up to 50 MB. Students read it inside the app; there is no download button.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ql-type">Type</Label>
              <select
                id="ql-type"
                value={type}
                onChange={(e) => setType(e.target.value as ResourceKind)}
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              >
                {RESOURCE_KINDS.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ql-duration">Duration</Label>
              <Input id="ql-duration" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="1h / Read" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim() || (!url.trim() && !file)} className="rounded-full">
            {pending && <LoaderCircle className="animate-spin" />} Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* CSV import                                                                  */
/* -------------------------------------------------------------------------- */

const SAMPLE = `topicKey,title,type,url,duration,isPremium
S4.01,What a network is — hosts, links and protocols,video,https://www.youtube.com/watch?v=xxxx,22m,false
S4.02,OSI and TCP/IP models,doc,https://example.com/osi,Read,false`;

export function CsvImport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [pending, start] = useTransition();

  const check = () =>
    start(async () => {
      setPreview(await previewResourceCsv(text));
    });

  const run = () =>
    start(async () => {
      const res = await importResourceCsv(text);
      if (res.ok) {
        toast.success(res.message ?? "Imported");
        setText("");
        setPreview(null);
        router.refresh();
      } else toast.error(res.error);
    });

  const onFile = async (file: File) => {
    setText(await file.text());
    setPreview(null);
  };

  const reach = preview ? preview.rows.reduce((n, r) => n + (preview.reach[r.topicKey] ?? 0), 0) : 0;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Bulk import</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prepare links in a spreadsheet and paste them here. Columns: <code className="font-mono text-xs">topicKey, title, type, url</code>, plus optional{" "}
        <code className="font-mono text-xs">duration</code> and <code className="font-mono text-xs">isPremium</code>. Each row is attached to every path that
        teaches the topic; a link already on a topic is skipped.
      </p>

      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        rows={8}
        placeholder={SAMPLE}
        className="mt-4 font-mono text-xs"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" className="rounded-full" asChild>
          <label>
            <Upload /> Choose .csv
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </Button>
        <Button variant="outline" className="rounded-full" onClick={check} disabled={pending || !text.trim()}>
          {pending && !preview && <LoaderCircle className="animate-spin" />} Check
        </Button>
        <Button
          className="rounded-full"
          onClick={run}
          disabled={pending || !preview || !!preview.errors.length || !!preview.unknownTopics.length || !preview.rows.length}
        >
          {pending && preview && <LoaderCircle className="animate-spin" />} Import {preview?.rows.length ? `${preview.rows.length} rows` : ""}
        </Button>
      </div>

      {preview && (
        <div className="mt-4 space-y-2 text-sm">
          <p className="text-muted-foreground">
            {preview.rows.length} valid {preview.rows.length === 1 ? "row" : "rows"} → {reach} dot links across{" "}
            {new Set(preview.rows.map((r) => r.topicKey)).size} topics.
          </p>
          {preview.unknownTopics.length > 0 && (
            <p className="flex items-start gap-2 text-destructive">
              <X className="mt-0.5 size-4 shrink-0" />
              Unknown topic keys: <span className="font-mono text-xs">{preview.unknownTopics.join(", ")}</span>
            </p>
          )}
          {preview.errors.map((e) => (
            <p key={e.line} className="flex items-start gap-2 text-destructive">
              <X className="mt-0.5 size-4 shrink-0" />
              Line {e.line}: {e.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
