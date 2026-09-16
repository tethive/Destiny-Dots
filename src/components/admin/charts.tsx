"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
