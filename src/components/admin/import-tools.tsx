"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DomainMultiSelect } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { domains } from "@/lib/catalog";
import { reviewImported, runImport, saveImportSettings } from "@/server/actions/admin";

export function RunImportButton({ kind }: { kind: "jobs" | "updates" }) {
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
          const res = await runImport(kind);
          if (!res.ok) toast.error(res.error);
          else toast.success(res.message, { duration: 8000 });
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCw />} Import {kind} now
    </Button>
  );
}

type Settings = {
  autoPublishJobs: boolean;
  autoPublishUpdates: boolean;
  jobsCountry: string;
  jobQueries: Record<string, string>;
  providers: Record<"adzuna" | "remotive" | "jooble" | "devto" | "hackernews" | "rss", boolean>;
  rssFeeds: { name: string; url: string; domainTags: string[] }[];
};

const providerInfo: { key: keyof Settings["providers"]; label: string; kind: string; needsKey?: "adzuna" | "jooble" }[] = [
  { key: "adzuna", label: "Adzuna", kind: "Jobs in India", needsKey: "adzuna" },
  { key: "jooble", label: "Jooble", kind: "Jobs in India", needsKey: "jooble" },
  { key: "remotive", label: "Remotive", kind: "Remote jobs" },
  { key: "devto", label: "DEV Community", kind: "Articles" },
  { key: "hackernews", label: "Hacker News", kind: "Trending stories" },
  { key: "rss", label: "RSS feeds", kind: "Official blogs" },
];

export function ImportSettingsForm({ initial, keys }: { initial: Settings; keys: { adzuna: boolean; jooble: boolean } }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveImportSettings(v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {(["autoPublishJobs", "autoPublishUpdates"] as const).map((k) => (
          <label key={k} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
            <span>
              <span className="font-medium">{k === "autoPublishJobs" ? "Auto-publish jobs" : "Auto-publish updates"}</span>
              <span className="block text-muted-foreground">Off = imported items wait for your approval below</span>
            </span>
            <Switch checked={v[k]} onCheckedChange={(on) => setV({ ...v, [k]: on })} />
          </label>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Sources</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {providerInfo.map((p) => {
            const missingKey = p.needsKey && !keys[p.needsKey];
            return (
              <label key={p.key} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                <span>
                  <span className="font-medium">{p.label}</span>
                  <span className="block text-xs text-muted-foreground">{missingKey ? "API key not set — skipped" : p.kind}</span>
                </span>
                <Switch checked={v.providers[p.key]} onCheckedChange={(on) => setV({ ...v, providers: { ...v.providers, [p.key]: on } })} />
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Job search per domain</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {domains.map((d) => (
            <label key={d.tag} className="flex items-center gap-2 text-sm">
              <span className="w-32 shrink-0 truncate text-muted-foreground">{d.short}</span>
              <Input
                value={v.jobQueries[d.tag] ?? ""}
                maxLength={120}
                placeholder="Leave empty to skip"
                onChange={(e) => setV({ ...v, jobQueries: { ...v.jobQueries, [d.tag]: e.target.value } })}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">RSS feeds</h3>
        <div className="space-y-2">
          {v.rssFeeds.map((feed, i) => (
            <div key={i} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[160px_1fr_auto]">
              <Input value={feed.name} placeholder="Name" maxLength={60} onChange={(e) => setV({ ...v, rssFeeds: v.rssFeeds.map((f, j) => (j === i ? { ...f, name: e.target.value } : f)) })} />
              <Input value={feed.url} placeholder="https://example.com/feed.xml" onChange={(e) => setV({ ...v, rssFeeds: v.rssFeeds.map((f, j) => (j === i ? { ...f, url: e.target.value } : f)) })} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove feed" onClick={() => setV({ ...v, rssFeeds: v.rssFeeds.filter((_, j) => j !== i) })}>
                <Trash2 />
              </Button>
              <div className="sm:col-span-3">
                <DomainMultiSelect value={feed.domainTags} onChange={(tags) => setV({ ...v, rssFeeds: v.rssFeeds.map((f, j) => (j === i ? { ...f, domainTags: tags } : f)) })} />
              </div>
            </div>
          ))}
          {v.rssFeeds.length < 30 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setV({ ...v, rssFeeds: [...v.rssFeeds, { name: "", url: "", domainTags: [] }] })}>
              <Plus /> Add feed
            </Button>
          )}
        </div>
      </div>

      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Save import settings
      </Button>
    </form>
  );
}

export function ImportQueue({ kind, items }: { kind: "jobs" | "updates"; items: { id: string; title: string; meta: string; url: string }[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const router = useRouter();
  const act = (action: "publish" | "delete") =>
    start(async () => {
      const res = await reviewImported(kind, selected, action);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      setSelected([]);
      router.refresh();
    });

  if (!items.length) return <p className="p-5 text-sm text-muted-foreground">Nothing waiting for review.</p>;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b px-5 py-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={selected.length === items.length} onCheckedChange={(on) => setSelected(on ? items.map((i) => i.id) : [])} /> Select all
        </label>
        <span className="text-sm text-muted-foreground">{selected.length} selected</span>
        <div className="ml-auto flex gap-2">
          <Button size="sm" disabled={pending || !selected.length} onClick={() => act("publish")}>
            Publish
          </Button>
          <Button size="sm" variant="outline" disabled={pending || !selected.length} onClick={() => act("delete")}>
            Delete
          </Button>
        </div>
      </div>
      <ul className="max-h-[480px] divide-y overflow-y-auto">
        {items.map((i) => (
          <li key={i.id}>
            <label className="flex cursor-pointer items-start gap-3 px-5 py-3 hover:bg-muted/40">
              <Checkbox className="mt-1" checked={selected.includes(i.id)} onCheckedChange={(on) => setSelected((cur) => (on ? [...cur, i.id] : cur.filter((x) => x !== i.id)))} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{i.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{i.meta}</span>
              </span>
              <a href={i.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                Source
              </a>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
