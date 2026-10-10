"use client";

import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { POST_STATUS } from "@/lib/domain/labels";
import type { PostStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { PostCard } from "@/components/app/post-card";
import { useOverlays } from "@/components/app/overlays";
import { EmptyState } from "@/components/app/section";
import { creatorById } from "@/lib/domain/creators";
import { shortDate } from "@/lib/domain/format";
import type { DetailProps } from "./types";

const ORDER: PostStatus[] = ["draft_submitted", "revision_requested", "not_started", "approved", "published", "verified"];

export function PostsTab({ posts, initial }: DetailProps & { initial?: string }) {
  const { openPost } = useOverlays();
  const [filter, setFilter] = useState<PostStatus | "all">((initial as PostStatus) ?? "all");
  const list = posts.filter((p) => filter === "all" || p.status === filter).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.dueAt.localeCompare(b.dueAt));
  const multi = (id: string) => posts.filter((p) => p.activationId === id).length > 1;

  if (!posts.length) return <EmptyState icon={Clapperboard} title="No posts yet" description="Each accepted creator gets their deliverables here, with due dates and review status." />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip active={filter === "all"} onClick={() => setFilter("all")} count={posts.length}>All</Chip>
        {ORDER.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)} count={posts.filter((p) => p.status === s).length}>
            {POST_STATUS[s].label}
          </Chip>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Clapperboard} title="Nothing here" description="Choose another status." />
      ) : (
        <div className="grid grid-cols-2 gap-4 @xl/main:grid-cols-3 @3xl/main:grid-cols-4 @5xl/main:grid-cols-6">
          {list.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              onOpen={() => openPost(p.id)}
              subtitle={`${creatorById(p.creatorId)?.name.split(" ")[0]}${multi(p.activationId) ? ` · post ${p.index}` : ""} · ${p.publishedAt ? shortDate(p.publishedAt) : `due ${shortDate(p.dueAt)}`}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, count, children }: { active: boolean; onClick: () => void; count: number; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-card hover:text-foreground", active && "border-foreground/20 bg-foreground text-background hover:text-background")}
    >
      {children}
      <span className="opacity-60 tabular-nums">{count}</span>
    </button>
  );
}
