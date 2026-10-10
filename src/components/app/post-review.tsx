"use client";

import { useState } from "react";
import { Check, ExternalLink, ListChecks, MessageSquareWarning, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, pct, shortDate } from "@/lib/domain/format";
import { CTAS, OBJECTIVES } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";
import { Photo } from "./photo";
import { CreatorPhoto } from "./creator-photo";
import { DataTag, PostBadge } from "./status-badge";
import { formatDuration } from "./post-card";

export function PostReview({
  postId,
  open,
  onOpenChange,
  onOpenActivation,
}: {
  postId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenActivation: (id: string) => void;
}) {
  const { posts, campaigns, activations } = useAppState();
  const [playing, setPlaying] = useState(true);
  const [revising, setRevising] = useState(false);
  const [note, setNote] = useState("");
  const post = posts.find((p) => p.id === postId);
  if (!post) return null;
  const campaign = campaigns.find((c) => c.id === post.campaignId)!;
  const activation = activations.find((a) => a.id === post.activationId);
  const creator = creatorById(post.creatorId);
  const total = posts.filter((p) => p.activationId === post.activationId).length;
  const m = post.metrics;
  const brief = campaign.brief;
  const started = post.status !== "not_started";
  const first = creator?.name.split(" ")[0];

  const timeline = [
    { label: post.version > 1 ? `Draft v${post.version} submitted` : "Draft submitted", at: post.submittedAt },
    { label: "Approved", at: post.approvedAt },
    { label: `Published on ${PLATFORMS[post.platform].label}`, at: post.publishedAt },
    { label: "Views verified", at: post.verifiedAt },
  ];
  const checklist = [
    brief.mandatoryDemo && `Demo: ${brief.mandatoryDemo}`,
    ...brief.requiredMentions.map((r) => `Mentions ${r}`),
    `CTA: ${CTAS[brief.cta.type]}${brief.cta.destination ? ` (${brief.cta.destination})` : ""}`,
    brief.script.mode !== "freedom" && brief.script.text,
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto p-0 sm:max-w-[880px] md:overflow-hidden">
        <div className="grid md:grid-cols-[340px_1fr]">
          <div className="relative flex items-center justify-center bg-neutral-950 p-5">
            <div className="relative aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-xl bg-neutral-900 md:max-w-[300px]">
              <div className="absolute inset-0" style={{ animation: playing && started ? `kenburns ${post.duration}s ease-in-out infinite alternate` : undefined }}>
                <Photo src={post.thumbnail} alt={post.caption} sizes="300px" className={cn(!started && "blur-sm grayscale-[0.4]")} />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
              <div className="absolute inset-x-3 top-3 flex items-center gap-2">
                {creator && <CreatorPhoto creator={creator} size={24} />}
                <span className="text-xs font-semibold text-white">{creator?.handle}</span>
                <span className="ml-auto rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">{started ? `v${post.version}` : "Not submitted"}</span>
              </div>
              {started ? (
                <>
                  <p className="absolute inset-x-3 bottom-9 line-clamp-3 text-xs leading-snug text-white">{post.caption}</p>
                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
                    <button type="button" onClick={() => setPlaying((p) => !p)} className="text-white" aria-label={playing ? "Pause preview" : "Play preview"}>
                      {playing ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                    </button>
                    <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                      <div className="h-full bg-white" style={{ animation: `progress ${post.duration}s linear infinite`, animationPlayState: playing ? "running" : "paused" }} />
                    </div>
                    <span className="text-[10px] text-white/80 tabular-nums">{formatDuration(post.duration)}</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-white">
                  <span className="text-sm font-medium">{first} is creating this</span>
                  <span className="text-xs text-white/70">Due {shortDate(post.dueAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col md:max-h-[85vh]">
            <div className="flex-1 space-y-5 p-6 md:overflow-y-auto">
              <div>
                <div className="flex items-center gap-2">
                  <PostBadge status={post.status} />
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <PlatformIcon platform={post.platform} className="size-3.5" />
                    {PLATFORMS[post.platform].format}
                    {total > 1 && ` · post ${post.index} of ${total}`}
                  </span>
                </div>
                <DialogTitle className="mt-2 text-lg font-semibold tracking-tight">{creator?.name}</DialogTitle>
                <DialogDescription>{campaign.name}</DialogDescription>
                <div className="mt-1 flex gap-3 text-xs">
                  {activation && (
                    <button type="button" className="font-medium text-primary hover:underline" onClick={() => onOpenActivation(activation.id)}>
                      View creator activation
                    </button>
                  )}
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Open post <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              {post.revisionNote && post.status === "revision_requested" && (
                <div className="rounded-lg border border-destructive/20 bg-destructive-subtle/60 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-destructive-text">
                    <MessageSquareWarning className="size-3.5" />
                    Your revision request
                  </div>
                  {post.revisionNote}
                </div>
              )}

              {m ? (
                <section>
                  <div className="mb-2 flex items-center gap-2">
                    <h3 className="text-sm font-semibold">Performance</h3>
                    {post.status === "verified" ? <DataTag kind="verified" /> : <span className="text-xs text-muted-foreground">Verifying (up to 48h)</span>}
                  </div>
                  {m.views === 0 ? (
                    <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Just went live. First numbers arrive within 24 hours.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border">
                      {(
                        [
                          ["Organic views", compact(m.views), "verified"],
                          ["Engagement", pct(((m.likes + m.comments + m.shares) / m.views) * 100, 1), "verified"],
                          ["Shares", compact(m.shares), "verified"],
                          ["Link clicks", compact(m.clicks), "attributed"],
                          [campaign.objective === "sales" ? "Purchases" : campaign.objective === "leads" ? "Leads" : "Conversions", m.conversions ? compact(m.conversions) : "—", "attributed"],
                          ["Comments", compact(m.comments), "verified"],
                        ] as const
                      ).map(([label, value, kind]) => (
                        <div key={label} className="bg-card p-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            {label}
                            {kind === "attributed" && <DataTag kind="attributed" />}
                          </div>
                          <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-1.5 text-xs text-muted-foreground">Primary result for this campaign: {OBJECTIVES[campaign.objective].tracking}.</p>
                </section>
              ) : (
                <section className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Performance appears once the creator publishes. Nothing is estimated for content that isn&apos;t live.</section>
              )}

              <section>
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <ListChecks className="size-4 text-muted-foreground" />
                  Brief requirements
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {checklist.map((c) => (
                    <li key={c} className="flex gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-success" strokeWidth={2.5} />
                      {c}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold">Timeline</h3>
                <ol className="space-y-2.5">
                  {timeline.map((t) => (
                    <li key={t.label} className="flex items-center gap-3 text-sm">
                      <span className={cn("flex size-5 items-center justify-center rounded-full border", t.at ? "border-success bg-success text-white" : "border-dashed bg-card")}>{t.at && <Check className="size-3" strokeWidth={3} />}</span>
                      <span className={cn("flex-1", !t.at && "text-muted-foreground")}>{t.label}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{t.at ? shortDate(t.at) : "—"}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">
                  Due {shortDate(post.dueAt)} · {brief.review.revisionRounds} revision round{brief.review.revisionRounds === 1 ? "" : "s"} included · {brief.review.turnaroundDays}-day review turnaround
                </p>
              </section>

              {revising && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">What should change?</h3>
                  <Textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Be specific: timestamps, shots, wording. The creator sees exactly this." className="resize-none" />
                </section>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              {post.status === "draft_submitted" &&
                (revising ? (
                  <>
                    <Button variant="ghost" className="h-9" onClick={() => setRevising(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="h-9"
                      variant="destructive"
                      disabled={note.trim().length < 5}
                      onClick={() => {
                        actions.requestRevision(post.id, note.trim());
                        toast(`Revision requested from ${first}`);
                        setRevising(false);
                      }}
                    >
                      Send revision request
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="h-9" onClick={() => setRevising(true)} disabled={post.version > brief.review.revisionRounds + 1}>
                      Request revision
                    </Button>
                    <Button
                      className="h-9"
                      onClick={() => {
                        actions.approvePost(post.id);
                        toast.success("Approved", { description: `${first} can now publish it.` });
                      }}
                    >
                      <Check />
                      Approve
                    </Button>
                  </>
                ))}
              {post.status === "approved" && <span className="text-sm text-muted-foreground">Waiting for {first} to publish by {shortDate(post.dueAt)}</span>}
              {post.status === "revision_requested" && <span className="text-sm text-muted-foreground">Waiting for v{post.version + 1}</span>}
              {post.status === "not_started" && <span className="text-sm text-muted-foreground">Nothing to review yet</span>}
              {post.status === "published" && <span className="text-sm text-muted-foreground">Live since {shortDate(post.publishedAt!)} · verifying views</span>}
              {post.status === "verified" && <span className="text-sm text-muted-foreground">Verified {shortDate(post.verifiedAt!)}</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
