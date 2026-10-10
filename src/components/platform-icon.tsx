import { FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/domain/types";

export type { Platform };

export const PLATFORMS: Record<Platform, { label: string; short: string; format: string; icon: typeof FaInstagram; color: string; tint: string }> = {
  tiktok: { label: "TikTok", short: "TikTok", format: "TikTok video", icon: FaTiktok, color: "text-foreground", tint: "bg-foreground/8" },
  instagram: { label: "Instagram Reels", short: "Reels", format: "Reel", icon: FaInstagram, color: "text-[#E1306C]", tint: "bg-[#E1306C]/10" },
  youtube: { label: "YouTube Shorts", short: "Shorts", format: "Short", icon: FaYoutube, color: "text-[#FF0000]", tint: "bg-[#FF0000]/10" },
};

export const PLATFORM_ORDER: Platform[] = ["tiktok", "instagram", "youtube"];

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
