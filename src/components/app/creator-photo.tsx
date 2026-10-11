import { cn } from "@/lib/utils";
import type { Creator } from "@/lib/domain/types";

// Tinted tiles, not portraits: the demo shows no faces. Each pair is AA (≥4.5:1).
const TONES = [
  "bg-brand-subtle text-brand-subtle-foreground",
  "bg-success-subtle text-success-text",
  "bg-warning-subtle text-warning-text",
  "bg-destructive-subtle text-destructive-text",
  "bg-muted text-foreground",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function toneFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

/** Creator avatar: square initials tile, colour stable per name. */
export function CreatorPhoto({
  creator,
  size = 32,
  ring = false,
  className,
}: {
  creator: Pick<Creator, "name" | "photo">;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={creator.name}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center font-semibold select-none",
        toneFor(creator.name),
        ring && "ring-2 ring-card",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.38)) }}
    >
      {initials(creator.name)}
    </span>
  );
}

export function CreatorStack({
  creators,
  max = 4,
  size = 24,
}: {
  creators: Pick<Creator, "id" | "name" | "photo">[];
  max?: number;
  size?: number;
}) {
  const shown = creators.slice(0, max);
  const extra = creators.length - shown.length;
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((c) => (
        <CreatorPhoto key={c.id} creator={c} size={size} ring />
      ))}
      {extra > 0 && (
        <span
          className="relative inline-flex items-center justify-center rounded-none bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card tabular-nums"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
