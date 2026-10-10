import { cn } from "@/lib/utils";

/** Minimal SVG sparkline: one series, 1.5px stroke, soft fill, last point marked. */
export function Sparkline({ values, className, width = 96, height = 28 }: { values: number[]; className?: string; width?: number; height?: number }) {
  if (!values.length || values.every((v) => v === 0)) {
    return <span className={cn("inline-block text-xs text-muted-foreground", className)}>—</span>;
  }
  const max = Math.max(...values, 1);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 2 - (v / max) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible text-chart-1", className)} aria-hidden>
      <path d={area} fill="currentColor" opacity={0.1} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={2} fill="currentColor" />
    </svg>
  );
}
