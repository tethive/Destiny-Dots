"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type Point = { label: string; signups: number; revenue: number };

/** Single-series trend (one measure per chart — never dual axis). */
export function TrendChart({ data, dataKey, label, format }: { data: Point[]; dataKey: "signups" | "revenue"; label: string; format?: "inr" }) {
  const config = { [dataKey]: { label, color: "var(--chart-1)" } } satisfies ChartConfig;
  const fmt = (v: number) => (format === "inr" ? `₹${v.toLocaleString("en-IN")}` : v.toLocaleString("en-IN"));
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.28} />
            <stop offset="100%" stopColor={`var(--color-${dataKey})`} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={format === "inr" ? 56 : 32} fontSize={11} allowDecimals={false} tickFormatter={fmt} />
        <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent formatter={(v) => fmt(Number(v))} />} />
        <Area dataKey={dataKey} type="monotone" stroke={`var(--color-${dataKey})`} strokeWidth={2} fill={`url(#fill-${dataKey})`} activeDot={{ r: 4 }} />
      </AreaChart>
    </ChartContainer>
  );
}

export function TopPathsChart({ data }: { data: { title: string; enrolled: number }[] }) {
  const config = { enrolled: { label: "Enrolled", color: "var(--chart-1)" } } satisfies ChartConfig;
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }} barCategoryGap={8}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
        <YAxis type="category" dataKey="title" tickLine={false} axisLine={false} width={150} fontSize={11} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent hideLabel={false} />} />
        <Bar dataKey="enrolled" fill="var(--color-enrolled)" radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ChartContainer>
  );
}

/** Emails sent per day, with the daily plan limit as a dashed reference line. */
export function DailyEmailsChart({ data, limit }: { data: { day: string; emails: number }[]; limit: number }) {
  const config = { emails: { label: "Emails sent", color: "var(--chart-1)" } } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, label: new Date(`${d.day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }) }));
  const peak = Math.max(limit, ...data.map((d) => d.emails)) * 1.1;
  const mag = 10 ** Math.floor(Math.log10(peak));
  const step = [0.2, 0.25, 0.5, 1, 2].map((m) => m * mag).find((st) => peak / st <= 4)!;
  const ticks = Array.from({ length: Math.ceil(peak / step) + 1 }, (_, i) => i * step);
  return (
    <ChartContainer config={config} className="aspect-auto h-52 w-full">
      <BarChart data={rows} margin={{ left: 4, right: 8, top: 12 }} barCategoryGap={3}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} tickMargin={8} fontSize={11} />
        <YAxis tickLine={false} axisLine={false} width={36} fontSize={11} allowDecimals={false} domain={[0, ticks.at(-1)!]} ticks={ticks} />
        <ReferenceLine y={limit} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: `Daily limit ${limit}`, position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }} />
        <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent />} />
        <Bar dataKey="emails" fill="var(--color-emails)" radius={[4, 4, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ChartContainer>
  );
}
