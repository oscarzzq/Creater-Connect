import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pill toggle for multi-select filters (niches, tiers, tags). */
export function ChipToggle({
  pressed,
  onPressedChange,
  children,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-3 text-sm font-medium transition-colors outline-none",
        "hover:border-foreground/20 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/40 [&_svg]:size-3.5 [&_svg]:shrink-0",
        pressed &&
          "border-primary/40 bg-brand-subtle text-brand-subtle-foreground hover:border-primary/60 hover:bg-brand-subtle",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Static removable tag (selected locations, links, etc.). */
export function Tag({
  children,
  onRemove,
  className,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border bg-muted/60 pr-1 pl-2.5 text-sm",
        !onRemove && "pr-2.5",
        className
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Remove"
        >
          <X className="size-3.5" />
        </button>
      )}
    </span>
  );
}
