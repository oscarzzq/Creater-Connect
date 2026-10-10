import { cn } from "@/lib/utils";

/** White card that groups one block of the builder form. */
export function FormSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border bg-card p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function FieldLabel({ children, hint, htmlFor }: { children: React.ReactNode; hint?: string; htmlFor?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </label>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function Helper({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-2 text-xs text-muted-foreground", className)}>{children}</p>;
}

/** Input with a leading "$" adornment. */
export function MoneyInput({
  value,
  onChange,
  id,
  size = "default",
}: {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  size?: "default" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex items-center rounded-lg border border-input bg-transparent transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        size === "lg" ? "h-11 px-3.5" : "h-9 px-3"
      )}
    >
      <span className={cn("text-muted-foreground", size === "lg" ? "text-lg" : "text-sm")}>$</span>
      <input
        id={id}
        inputMode="numeric"
        value={value ? value.toLocaleString("en-US") : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
        className={cn(
          "w-full min-w-0 bg-transparent pl-1 tabular-nums outline-none",
          size === "lg" ? "text-lg font-semibold" : "text-sm"
        )}
      />
      <span className="text-xs text-muted-foreground">USD</span>
    </div>
  );
}
