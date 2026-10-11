import { FaEnvelopeOpenText, FaLinkedin, FaXTwitter, FaYoutube } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/domain/types";

export type { Platform };

/**
 * `format` is the native unit for a single sponsored post; `unit` is what the platform
 * reports as reach (we call it "views" product-wide).
 */
export const PLATFORMS: Record<Platform, { label: string; short: string; format: string; unit: string; icon: typeof FaLinkedin; color: string; tint: string }> = {
  linkedin: { label: "LinkedIn", short: "LinkedIn", format: "LinkedIn post", unit: "impressions", icon: FaLinkedin, color: "text-[#0A66C2]", tint: "bg-[#0A66C2]/10" },
  x: { label: "X (Twitter)", short: "X", format: "post on X", unit: "views", icon: FaXTwitter, color: "text-foreground", tint: "bg-foreground/8" },
  youtube: { label: "YouTube", short: "YouTube", format: "YouTube video", unit: "views", icon: FaYoutube, color: "text-[#FF0000]", tint: "bg-[#FF0000]/10" },
  newsletter: { label: "Newsletter", short: "Newsletter", format: "newsletter feature", unit: "opens", icon: FaEnvelopeOpenText, color: "text-primary", tint: "bg-primary/10" },
};

export const PLATFORM_ORDER: Platform[] = ["linkedin", "x", "youtube", "newsletter"];

export function PlatformIcon({ platform, className, muted = false }: { platform: Platform; className?: string; muted?: boolean }) {
  const p = PLATFORMS[platform];
  const Icon = p.icon;
  return <Icon aria-label={p.label} className={cn("size-4 shrink-0", muted ? "text-muted-foreground" : p.color, className)} />;
}

export function PlatformTile({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-lg", PLATFORMS[platform].tint, className)}>
      <PlatformIcon platform={platform} className="size-[18px]" />
    </span>
  );
}

export function PlatformIconRow({ platforms, className }: { platforms: Platform[]; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="size-3.5" />
      ))}
    </span>
  );
}
