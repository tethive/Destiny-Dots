"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Library, LoaderCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { setCertificationResources } from "@/server/actions/admin";

export type PickerResource = { id: string; title: string; type: string; level: string; isPremium: boolean };

const levels = ["ALL", "BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

export function CertResourcePicker({ certId, certName, selectedIds, library }: { certId: string; certName: string; selectedIds: string[]; library: PickerResource[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<(typeof levels)[number]>("ALL");
  const [pending, start] = useTransition();
  const router = useRouter();

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    const list = library.filter((r) => (!term || r.title.toLowerCase().includes(term)) && (level === "ALL" || r.level === level));
    return [...selected.map((id) => list.find((r) => r.id === id)).filter(Boolean), ...list.filter((r) => !selected.includes(r.id))] as PickerResource[];
  }, [library, q, level, selected]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setSelected(selectedIds);
          setQ("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Library className="size-4" /> {selectedIds.length}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Resources for {certName}</DialogTitle>
          <DialogDescription>Students see these in the guide&apos;s Resources tab, filterable by level. Add new items in the resource library first.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the library" className="pl-9" />
          </div>
          <div className="flex rounded-lg border p-0.5 text-xs">
            {levels.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`rounded-md px-2 py-1 capitalize ${level === l ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {l.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
        <ul className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.slice(0, 250).map((r) => {
            const idx = selected.indexOf(r.id);
            return (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-muted">
                  <Checkbox checked={idx >= 0} onCheckedChange={(v) => setSelected((cur) => (v ? [...cur, r.id] : cur.filter((x) => x !== r.id)))} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{r.title}</span>
                    <span className="font-mono text-[10px] text-muted-foreground uppercase">
                      {r.type} · {r.level.toLowerCase()}
                      {r.isPremium && " · premium"}
                    </span>
                  </span>
                  {idx >= 0 && <span className="font-mono text-xs text-primary">#{idx + 1}</span>}
                </label>
              </li>
            );
          })}
          {filtered.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No resources match.</li>}
        </ul>
        <DialogFooter>
          <p className="mr-auto self-center text-sm text-muted-foreground">{selected.length} selected</p>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await setCertificationResources(certId, selected);
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message);
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
