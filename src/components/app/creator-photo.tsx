import { Photo } from "./photo";
import { cn } from "@/lib/utils";
import type { Creator } from "@/lib/domain/types";

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
      className={cn("relative inline-block shrink-0 overflow-hidden rounded-full bg-muted", ring && "ring-2 ring-card", className)}
      style={{ width: size, height: size }}
    >
      <Photo src={creator.photo} alt={creator.name} faces sizes={`${size * 2}px`} />
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
          className="relative inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground ring-2 ring-card tabular-nums"
          style={{ width: size, height: size }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
