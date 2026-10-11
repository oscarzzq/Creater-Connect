import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-muted-foreground/70 hover:text-foreground" aria-label="More info">
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{children}</TooltipContent>
    </Tooltip>
  );
}

export function Delta({ value, suffix = "", invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", good ? "text-success-text" : "text-destructive-text")}>
      <Icon className="size-3.5" />
      {up ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

export function KpiCard({
  label,
  info,
  value,
  sub,
  delta,
  children,
  className,
}: {
  label: string;
  info?: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  delta?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface flex flex-col p-4", className)}>
      <div className="flex items-center gap-1 text-[13px] font-medium text-muted-foreground">
        {label}
        {info && <InfoTip>{info}</InfoTip>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {delta}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
      {children && <div className="mt-auto pt-3">{children}</div>}
    </div>
  );
}

/** Horizontal stacked bar with 2px gaps between segments. */
export function StackedBar({
  segments,
  total,
  className,
}: {
  segments: { value: number; className: string; label?: string }[];
  total: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted", className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s, i) => (
          <div key={i} title={s.label} className={cn("h-full first:rounded-l-full last:rounded-r-full", s.className)} style={{ width: `${(s.value / total) * 100}%` }} />
        ))}
    </div>
  );
}

export function ProgressRow({ label, value, max, right, tone = "bg-primary" }: { label: string; value: number; max: number; right?: React.ReactNode; tone?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{right ?? `${value}/${max}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-500", tone)} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
      </div>
    </div>
  );
}
