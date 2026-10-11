import { AlertTriangle, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchResult } from "@/lib/domain/matching";

export function scoreTone(score: number) {
  if (score >= 85) return "text-success";
  if (score >= 70) return "text-primary";
  return "text-warning";
}

export function factorBarTone(score: number) {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-primary";
  return "bg-warning";
}

export function MatchRing({ score, size = 40, className, label = "Audience relevance" }: { score: number; size?: number; className?: string; label?: string }) {
  const stroke = size >= 48 ? 4 : 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", scoreTone(score), className)} style={{ width: size, height: size }} aria-label={`${label} ${score}`} title={`${label}: ${score}/100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke="currentColor" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
      </svg>
      <span className={cn("absolute font-semibold text-foreground tabular-nums", size >= 48 ? "text-sm" : "text-[11px]")}>{score}</span>
    </span>
  );
}

const SHORT: Record<string, string> = { audience: "Audience", relevance: "Relevance", performance: "Views", efficiency: "Value", quality: "Quality" };

export function FactorBars({ match, className }: { match: MatchResult; className?: string }) {
  return (
    <div className={cn("grid grid-cols-5 gap-1", className)}>
      {match.factors.map((f) => (
        <div key={f.key} title={`${f.label}: ${f.score}`} className="space-y-1">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full rounded-full", factorBarTone(f.score))} style={{ width: `${f.score}%` }} />
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{SHORT[f.key]}</div>
        </div>
      ))}
    </div>
  );
}

export function MatchBreakdown({ match }: { match: MatchResult }) {
  if (!match.eligible) {
    return (
      <div className="rounded-xl border border-destructive/25 bg-destructive-subtle/50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive-text">
          <XCircle className="size-4" />
          Doesn&apos;t meet this creator set&apos;s requirements
        </div>
        <ul className="mt-2 space-y-1 text-sm">
          {match.exclusions.map((e) => (
            <li key={e} className="flex gap-2 text-foreground/80">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-destructive" />
              {e}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">Strict requirements are never relaxed to fill a roster.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start gap-3">
        <MatchRing score={match.score} size={48} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-3.5 text-primary" />
            Why we matched them
          </div>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">{match.summary}</p>
          {match.watchOut && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-warning-text">
              <AlertTriangle className="size-3.5" />
              {match.watchOut}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {match.factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium">{f.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {f.score}
                <span className="text-muted-foreground/60"> · {Math.round(f.weight * 100)}% weight</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", factorBarTone(f.score))} style={{ width: `${f.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
