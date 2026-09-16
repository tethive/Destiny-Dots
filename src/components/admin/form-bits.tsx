"use client";

import { DomainIcon } from "@/components/domain";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { domains, type DomainTag } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EnumSelect({ value, onChange, options, placeholder = "Choose" }: { value?: string; onChange: (v: string) => void; options: Record<string, string>; placeholder?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DomainMultiSelect({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {domains.map((d) => {
        const on = value.includes(d.tag);
        return (
          <button
            key={d.tag}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((t) => t !== d.tag) : [...value, d.tag])}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs transition-colors",
              on ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <DomainIcon tag={d.tag as DomainTag} className="size-5 rounded-full [&_svg]:size-3" /> {d.short}
          </button>
        );
      })}
    </div>
  );
}

export function PathMultiSelect({ value, onChange, paths }: { value: string[]; onChange: (v: string[]) => void; paths: { slug: string; title: string }[] }) {
  return (
    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
      {paths.map((p) => {
        const on = value.includes(p.slug);
        return (
          <button
            key={p.slug}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((s) => s !== p.slug) : [...value, p.slug])}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              on ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.title}
          </button>
        );
      })}
    </div>
  );
}

export const levelOptions = { BEGINNER: "Beginner", INTERMEDIATE: "Intermediate", ADVANCED: "Advanced" };
export const domainOptions = Object.fromEntries(domains.map((d) => [d.tag, d.name]));
