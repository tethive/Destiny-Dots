"use client";

import { useState } from "react";
import { Library } from "lucide-react";
import { DotResources, type DotResourceItem } from "@/components/app/dot-resources";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const levelFilters = [
  { value: "ALL", label: "All levels" },
  { value: "Beginner", label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced", label: "Advanced" },
] as const;

export function CertificationTabs({ overview, resources, initialTab }: { overview: React.ReactNode; resources: DotResourceItem[]; initialTab: "overview" | "resources" }) {
  const [level, setLevel] = useState<(typeof levelFilters)[number]["value"]>("ALL");
  const counts = Object.fromEntries(levelFilters.map((f) => [f.value, f.value === "ALL" ? resources.length : resources.filter((r) => r.level === f.value).length]));
  const shown = level === "ALL" ? resources : resources.filter((r) => r.level === level);

  return (
    <Tabs defaultValue={initialTab} className="mt-8">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="resources" className="gap-1.5">
          <Library className="size-4" /> Resources
          <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{resources.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overview}
      </TabsContent>

      <TabsContent value="resources" className="mt-6">
        <div role="radiogroup" aria-label="Filter by level" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {levelFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={level === f.value}
              onClick={() => setLevel(f.value)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                level === f.value ? "border-foreground bg-foreground text-background" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label} <span className="ml-1 tabular-nums opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {resources.length === 0 ? "Study resources for this certification are being curated." : "No resources at this level yet."}
          </p>
        ) : (
          <DotResources key={level} resources={shown} />
        )}
      </TabsContent>
    </Tabs>
  );
}
