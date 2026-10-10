import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <circle cx="8.5" cy="12" r="4.5" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="15.5" cy="12" r="4.5" fill="currentColor" fillOpacity="0.55" />
      </svg>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>Creator Connect</span>
    </span>
  );
}
