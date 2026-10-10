"use client";

import { Eye, Play } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { creatorById } from "@/lib/domain/creators";
import { compact, shortDate } from "@/lib/domain/format";
import type { Post } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Photo } from "./photo";
import { CreatorPhoto } from "./creator-photo";

export function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const DOT: Record<Post["status"], string> = {
  not_started: "bg-white/70",
  draft_submitted: "bg-warning",
  revision_requested: "bg-destructive",
  approved: "bg-primary",
  published: "bg-primary",
  verified: "bg-success",
};

const LABEL: Record<Post["status"], string> = {
  not_started: "In production",
  draft_submitted: "Needs review",
  revision_requested: "Revision",
  approved: "Ready to post",
  published: "Verifying",
  verified: "Live",
};

/** 9:16 post tile. Views appear only for published posts; nothing is estimated here. */
export function PostCard({ post, onOpen, subtitle, className, size = "md" }: { post: Post; onOpen?: () => void; subtitle?: string; className?: string; size?: "sm" | "md" }) {
  const creator = creatorById(post.creatorId);
  const started = post.status !== "not_started";
  return (
    <button type="button" onClick={onOpen} className={cn("group block w-full text-left outline-none", className)} aria-label={`${creator?.name} post ${post.index}`}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/5 transition-shadow group-hover:shadow-float group-focus-visible:ring-3 group-focus-visible:ring-ring/50">
        <Photo
          src={post.thumbnail}
          alt={post.caption || `${creator?.name} post`}
          sizes={size === "sm" ? "160px" : "240px"}
          className={cn("transition-transform duration-500 group-hover:scale-[1.04]", !started && "scale-105 blur-[2px] grayscale-[0.4]")}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/75" />
        <div className="absolute inset-x-2 top-2 flex items-center justify-between gap-1">
          <span className="inline-flex h-5 items-center rounded-md bg-black/45 px-1.5 backdrop-blur-sm">
            <PlatformIcon platform={post.platform} className="size-3 text-white" />
          </span>
          <span className="inline-flex h-5 items-center gap-1 rounded-md bg-black/45 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <span className={cn("size-1.5 rounded-full", DOT[post.status])} />
            {LABEL[post.status]}
          </span>
        </div>
        {started ? (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
              <Play className="ml-0.5 size-4 fill-current" />
            </span>
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-md bg-black/50 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">Due {shortDate(post.dueAt)}</span>
          </span>
        )}
        <div className="absolute inset-x-2 bottom-2 space-y-1.5">
          {post.metrics && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-white tabular-nums">
              <Eye className="size-3" />
              {post.metrics.views ? compact(post.metrics.views) : "Collecting"}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            {creator && <CreatorPhoto creator={creator} size={18} />}
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">{creator?.name}</span>
            {started && <span className="text-[10px] text-white/80 tabular-nums">{formatDuration(post.duration)}</span>}
          </div>
        </div>
      </div>
      {subtitle && <div className="mt-1.5 truncate px-0.5 text-xs text-muted-foreground">{subtitle}</div>}
    </button>
  );
}
