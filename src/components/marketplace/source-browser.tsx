"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronRight, Download, File, FileCode2, Folder, LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { browseProjectSource } from "@/server/actions/marketplace";

type Entry = { path: string; size: number; isText: boolean };

const kb = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

/** In-app file explorer for a purchased project's ZIP, with a code viewer and a download button. */
export function SourceBrowser({ projectId, downloadKey, archiveName }: { projectId: string; downloadKey: string; archiveName: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState<{ path: string; text?: string; error?: string } | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let cancelled = false;
    browseProjectSource(projectId).then((res) => {
      if (cancelled) return;
      if ("entries" in res && res.entries) {
        setEntries(res.entries);
        const readme = res.entries.find((e) => /(^|\/)readme\.md$/i.test(e.path)) ?? res.entries.find((e) => e.isText);
        if (readme) open(readme.path);
      } else setError(("error" in res && res.error) || "Couldn't open the archive.");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function open(path: string) {
    setSelected(path);
    start(async () => {
      const res = await browseProjectSource(projectId, path);
      setContent({ path, ...("text" in res ? { text: res.text } : { error: "error" in res ? res.error : "Preview unavailable" }) });
    });
  }

  const shown = useMemo(() => (entries ?? []).filter((e) => !q || e.path.toLowerCase().includes(q.toLowerCase())), [entries, q]);
  const lines = content?.text?.split("\n") ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <FileCode2 className="size-4 text-primary" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{archiveName}</p>
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <a href={`/api/files/${downloadKey}?download=1`}>
            <Download /> Download ZIP
          </a>
        </Button>
      </div>
      {error ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{error}</p>
      ) : !entries ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <LoaderCircle className="animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr]">
          <div className="border-b md:border-r md:border-b-0">
            <div className="relative p-2">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${entries.length} files`} className="h-8 pl-7 text-xs" />
            </div>
            <ul className="max-h-72 overflow-y-auto px-1 pb-2 md:max-h-[520px]">
              {shown.map((e) => {
                const depth = e.path.split("/").length - 1;
                return (
                  <li key={e.path}>
                    <button
                      type="button"
                      disabled={!e.isText}
                      onClick={() => open(e.path)}
                      title={e.path}
                      className={cn(
                        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left font-mono text-xs",
                        selected === e.path ? "bg-primary/10 text-primary" : "hover:bg-muted",
                        !e.isText && "cursor-default opacity-60",
                      )}
                      style={{ paddingLeft: `${0.5 + Math.min(depth, 6) * 0.6}rem` }}
                    >
                      {e.isText ? <File className="size-3 shrink-0" /> : <Folder className="size-3 shrink-0" />}
                      <span className="truncate">{e.path.split("/").pop()}</span>
                      <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{kb(e.size)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="min-w-0">
            {content && (
              <div className="flex items-center gap-1 border-b px-3 py-2 font-mono text-xs text-muted-foreground">
                {content.path.split("/").map((seg, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    {seg}
                    {i < arr.length - 1 && <ChevronRight className="size-3" />}
                  </span>
                ))}
                {pending && <LoaderCircle className="ml-auto size-3 animate-spin" />}
              </div>
            )}
            <div className="max-h-[560px] overflow-auto bg-muted/20">
              {content?.error ? (
                <p className="p-8 text-center text-sm text-muted-foreground">{content.error}</p>
              ) : content?.text !== undefined ? (
                <pre className="py-3 font-mono text-xs leading-5">
                  {lines.map((line, i) => (
                    <div key={i} className="flex hover:bg-muted/60">
                      <span className="w-12 shrink-0 pr-3 text-right text-muted-foreground/60 select-none">{i + 1}</span>
                      <code className="pr-4 whitespace-pre">{line || " "}</code>
                    </div>
                  ))}
                </pre>
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Pick a file to preview it.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
