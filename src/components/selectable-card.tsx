import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Large clickable option. `type="radio"` for single choice, `"checkbox"` for
 * multi-select. Selected state uses the brand accent: border, ring, soft fill.
 */
export function SelectableCard({
  selected,
  onSelect,
  type = "radio",
  className,
  children,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  type?: "radio" | "checkbox";
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role={type}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "group/selectable relative flex w-full flex-col items-start gap-3 rounded-xl border bg-card p-4 text-left transition-[border-color,background-color,box-shadow] outline-none",
        "hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
        selected && "border-primary bg-brand-subtle/60 ring-1 ring-primary hover:border-primary",
        className
      )}
    >
      <SelectionIndicator type={type} selected={selected} className="absolute top-4 right-4" />
      {children}
    </button>
  );
}

export function SelectionIndicator({
  type,
  selected,
  className,
}: {
  type: "radio" | "checkbox";
  selected: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center border transition-colors",
        type === "radio" ? "rounded-full" : "rounded-[5px]",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background",
        className
      )}
    >
      {selected &&
        (type === "radio" ? (
          <span className="size-1.5 rounded-full bg-primary-foreground" />
        ) : (
          <Check className="size-3" strokeWidth={3} />
        ))}
    </span>
  );
}
