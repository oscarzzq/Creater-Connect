"use client";

import { Area, Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { shortDate } from "@/lib/domain/format";

export interface Series {
  id: string;
  label: string;
  values: number[];
  color?: string; // CSS color, defaults to chart-1
  dashed?: boolean; // reference lines (guarantee, previous period)
}

/** Categorical order for comparisons; colour follows the entity's position in the selection. */
export const SERIES_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function TrendChart({
  keys,
  series,
  format,
  kind = "area",
  height = 240,
}: {
  keys: string[];
  series: Series[];
  format: (n: number) => string;
  kind?: "area" | "bar" | "line";
  height?: number;
}) {
  const data = keys.map((k, i) => Object.fromEntries([["date", k], ...series.map((s) => [s.id, s.values[i] ?? 0])]));
  const single = series.filter((s) => !s.dashed).length === 1;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap={keys.length > 40 ? 1 : 3}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="date" tickFormatter={(d) => shortDate(`${d}T12:00:00`)} tickLine={false} axisLine={false} minTickGap={32} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis width={44} tickFormatter={format} tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Tooltip
            cursor={kind === "bar" ? { fill: "var(--muted)", opacity: 0.6 } : { stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <div className="min-w-36 rounded-lg border bg-popover px-3 py-2 text-xs shadow-float">
                  <div className="mb-1 text-muted-foreground">{shortDate(`${payload[0].payload.date}T12:00:00`)}</div>
                  {series.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 py-0.5">
                      {s.dashed ? <span className="w-2.5 border-t border-dashed border-muted-foreground" /> : <span className="size-2 rounded-full" style={{ background: s.color ?? SERIES_COLORS[i] }} />}
                      <span className="flex-1 truncate text-muted-foreground">{s.label}</span>
                      <span className="font-medium text-foreground tabular-nums">{format(payload[0].payload[s.id] as number)}</span>
                    </div>
                  ))}
                </div>
              ) : null
            }
          />
          {series.map((s, i) => {
            const color = s.color ?? SERIES_COLORS[i];
            if (s.dashed) return <Line key={s.id} type="monotone" dataKey={s.id} stroke="var(--muted-foreground)" strokeOpacity={0.6} strokeDasharray="4 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />;
            if (single && kind === "bar") return <Bar key={s.id} dataKey={s.id} fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />;
            if (single && kind === "area")
              return <Area key={s.id} type="monotone" dataKey={s.id} stroke={color} strokeWidth={2} fill="url(#trendFill)" isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} />;
            return <Line key={s.id} type="monotone" dataKey={s.id} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }} />;
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
      {series.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1.5">
          {s.dashed ? <span className="w-3 border-t border-dashed border-muted-foreground" /> : <span className="size-2 rounded-sm" style={{ background: s.color ?? SERIES_COLORS[i] }} />}
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: [T, string][]; className?: string }) {
  return (
    <div className={`inline-flex rounded-lg bg-muted p-0.5 ${className ?? ""}`} role="tablist">
      {options.map(([v, label]) => (
        <button
          key={v}
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`h-6 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors ${value === v ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
