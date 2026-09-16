import {
  Blocks,
  BrainCircuit,
  ChartColumn,
  Cloud,
  CodeXml,
  Cpu,
  Glasses,
  RadioTower,
  ShieldCheck,
  Terminal,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import type { DomainTag } from "@/lib/catalog";
import { cn } from "@/lib/utils";

/**
 * One colour per domain. `hex` is the vivid tone (dark theme, 3D scene);
 * `ink` is a deeper tone that stays readable on light surfaces. Components use
 * them through CSS variables — see the `d-*` utilities in globals.css.
 */
export const domainTheme: Record<DomainTag, { hex: string; ink: string; icon: LucideIcon }> = {
  cybersecurity: { hex: "#8b5cf6", ink: "#6d28d9", icon: ShieldCheck },
  "ethical-hacking": { hex: "#84cc16", ink: "#4d7c0f", icon: Terminal },
  "ai-ml": { hex: "#d946ef", ink: "#a21caf", icon: BrainCircuit },
  "cloud-computing": { hex: "#0ea5e9", ink: "#0369a1", icon: Cloud },
  "data-engineering": { hex: "#6366f1", ink: "#4338ca", icon: Workflow },
  "data-analysis": { hex: "#f97316", ink: "#c2410c", icon: ChartColumn },
  blockchain: { hex: "#eab308", ink: "#a16207", icon: Blocks },
  "full-stack": { hex: "#f43f5e", ink: "#be123c", icon: CodeXml },
  iot: { hex: "#10b981", ink: "#047857", icon: Cpu },
  "5g-technology": { hex: "#06b6d4", ink: "#0e7490", icon: RadioTower },
  "ar-vr": { hex: "#ec4899", ink: "#be185d", icon: Glasses },
};

export function domainVars(tag: DomainTag) {
  const t = domainTheme[tag];
  return { "--d": t.hex, "--d-ink": t.ink } as React.CSSProperties;
}

export function DomainIcon({ tag, className }: { tag: DomainTag; className?: string }) {
  const Icon = domainTheme[tag].icon;
  return (
    <span
      style={domainVars(tag)}
      className={cn("d-soft inline-flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg]:size-5", className)}
    >
      <Icon aria-hidden />
    </span>
  );
}

export function DomainBadge({ tag, label, className }: { tag: DomainTag; label: string; className?: string }) {
  return (
    <span
      style={domainVars(tag)}
      className={cn("d-soft d-ring inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
    >
      <span className="d-solid size-1.5 rounded-full" aria-hidden />
      {label}
    </span>
  );
}
