import { cn } from "@/lib/utils";
import { ACTIVATION_STATUS, POST_STATUS, STAGES, type Tone } from "@/lib/domain/labels";
import type { ActivationStatus, CampaignStage, PostStatus } from "@/lib/domain/types";

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground [--dot:var(--muted-foreground)]",
  brand: "bg-brand-subtle text-brand-subtle-foreground [--dot:var(--primary)]",
  success: "bg-success-subtle text-success-text [--dot:var(--success)]",
  warning: "bg-warning-subtle text-warning-text [--dot:var(--warning)]",
  danger: "bg-destructive-subtle text-destructive-text [--dot:var(--destructive)]",
};

export function StatusPill({ tone, children, className, dot = true }: { tone: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex h-5 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap", TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-(--dot)" />}
      {children}
    </span>
  );
}

export function StageBadge({ stage, className }: { stage: CampaignStage; className?: string }) {
  return (
    <StatusPill tone={STAGES[stage].tone} className={className}>
      {STAGES[stage].label}
    </StatusPill>
  );
}

export function ActivationBadge({ status, supplementary }: { status: ActivationStatus; supplementary?: boolean }) {
  return <StatusPill tone={ACTIVATION_STATUS[status].tone}>{supplementary && status === "accepted" ? "Make-good creator" : ACTIVATION_STATUS[status].label}</StatusPill>;
}

export function PostBadge({ status }: { status: PostStatus }) {
  return <StatusPill tone={POST_STATUS[status].tone}>{POST_STATUS[status].label}</StatusPill>;
}

/**
 * Marks where a number comes from:
 * verified (platform API), attributed (clicks/codes), estimate (projection), guaranteed (contract).
 */
export function DataTag({ kind, className }: { kind: "verified" | "attributed" | "estimate" | "guaranteed"; className?: string }) {
  const styles = {
    verified: "text-success-text ring-1 ring-success/30",
    attributed: "text-brand-subtle-foreground ring-1 ring-primary/25",
    estimate: "text-muted-foreground border border-dashed",
    guaranteed: "text-foreground ring-1 ring-foreground/20",
  }[kind];
  return (
    <span className={cn("inline-flex h-4 shrink-0 items-center gap-1 rounded px-1 text-[10px] font-medium tracking-wide uppercase", styles, className)}>
      {kind === "verified" && <span className="size-1 rounded-full bg-success" />}
      {kind}
    </span>
  );
}
