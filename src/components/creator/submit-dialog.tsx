"use client";

import { useId, useState } from "react";
import { Ban, CircleCheck, CloudUpload, MessageSquareWarning, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { Photo } from "@/components/app/photo";
import { formatDuration } from "@/components/app/post-card";
import { actions } from "@/lib/store";
import type { Campaign, Post } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { ctaLabel } from "./creator-data";

/** Mock upload: pick or drop a file (nothing is read), write the caption, send for review. */
export function SubmitDialog({ post, campaign, open, onOpenChange }: { post: Post | null; campaign: Campaign | undefined; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        {post && campaign && <SubmitForm key={post.id + post.version} post={post} campaign={campaign} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function SubmitForm({ post, campaign, onDone }: { post: Post; campaign: Campaign; onDone: () => void }) {
  const brief = campaign.brief;
  const review = brief.review.required;
  const revision = post.status === "revision_requested";
  const nextVersion = revision ? post.version + 1 : post.version;
  const [attached, setAttached] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [caption, setCaption] = useState(post.caption);
  const [meetsBrief, setMeetsBrief] = useState(false);
  const captionId = useId();
  const checkId = useId();
  const what = `${PLATFORMS[post.platform].format}${post.index > 1 || brief.deliverables > 1 ? ` ${post.index}` : ""}`;
  const fileName = `${campaign.promoting.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${post.index}-v${nextVersion}.mp4`;

  const checklist = [
    brief.mandatoryDemo && `Demo: ${brief.mandatoryDemo}`,
    brief.requiredMentions.length > 0 && `Mention ${brief.requiredMentions.join(", ")}`,
    `CTA: ${ctaLabel(brief)}${brief.cta.destination ? ` (${brief.cta.destination})` : ""}`,
    `Length: ${brief.videoLength}`,
  ].filter(Boolean) as string[];

  const ready = attached && (review || meetsBrief);

  function submit() {
    actions.submitDraft(post.id, caption.trim());
    if (review)
      toast.success(revision ? `v${nextVersion} sent to ${campaign.businessName}` : `Draft sent to ${campaign.businessName}`, {
        description: `They review within ${brief.review.turnaroundDays || 2} days. You'll see their decision in Work.`,
      });
    else toast.success("Ready to post", { description: "No approval needed for this one. Publish it, then submit the link." });
    onDone();
  }

  return (
    <>
      <DialogHeader className="border-b p-5">
        <DialogTitle className="flex items-center gap-2 text-base">
          <PlatformIcon platform={post.platform} />
          {revision ? `Upload v${nextVersion} · ${what}` : review ? `Submit draft · ${what}` : `Mark ${what} ready`}
        </DialogTitle>
        <DialogDescription>
          {campaign.businessName} · {campaign.name}
        </DialogDescription>
      </DialogHeader>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
        {revision && post.revisionNote && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-subtle/60 p-3 text-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
              <MessageSquareWarning className="size-3.5" />
              Changes requested on v{post.version}
            </div>
            <p className="mt-1 text-foreground/85">{post.revisionNote}</p>
          </div>
        )}

        {attached ? (
          <div className="flex items-center gap-3 rounded-xl border bg-muted/40 p-3">
            <span className="relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Photo src={post.thumbnail} alt={`Preview of ${what}`} sizes="96px" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <CircleCheck className="size-4 shrink-0 text-success" />
                <span className="truncate">{fileName}</span>
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">Video · {formatDuration(post.duration)} · ready to send</div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={() => setAttached(false)}>
              <X />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAttached(true)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              setAttached(true);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors outline-none hover:border-primary/40 hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50",
              dragging && "border-primary bg-brand-subtle/50"
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <CloudUpload className="size-5" />
            </span>
            <span className="mt-3 text-sm font-medium">
              Drop your video here or <span className="text-primary">browse</span>
            </span>
            <span className="mt-1 text-xs text-muted-foreground">MP4 or MOV · 9:16 · {brief.videoLength} · demo, nothing is uploaded</span>
          </button>
        )}

        <div>
          <Label htmlFor={captionId} className="text-xs text-muted-foreground">
            Caption you&apos;ll post
          </Label>
          <Textarea
            id={captionId}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            placeholder={`Write the caption you'll use${brief.requiredMentions.length ? `, including ${brief.requiredMentions.join(" ")}` : ""}.`}
            className="mt-1.5 resize-none"
          />
        </div>

        <div>
          <div className="text-xs font-medium text-muted-foreground">Check against the brief</div>
          <ul className="mt-1.5 space-y-1 text-[13px]">
            {checklist.map((d) => (
              <li key={d} className="flex gap-2">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-success" />
                {d}
              </li>
            ))}
            {brief.prohibited.map((d) => (
              <li key={d} className="flex gap-2 text-muted-foreground">
                <Ban className="mt-0.5 size-3.5 shrink-0 text-destructive-text" />
                Avoid: {d}
              </li>
            ))}
          </ul>
        </div>

        {!review && (
          <div className="flex items-start gap-2.5 rounded-lg border p-3">
            <Checkbox id={checkId} checked={meetsBrief} onCheckedChange={(v) => setMeetsBrief(v === true)} className="mt-0.5" />
            <Label htmlFor={checkId} className="text-sm leading-snug font-normal">
              My content covers everything above. {campaign.businessName} doesn&apos;t review drafts for this campaign, so I&apos;ll publish once it&apos;s ready.
            </Label>
          </div>
        )}
      </div>

      <DialogFooter className="mx-0 mb-0 p-4">
        <Button variant="outline" className="h-10" onClick={onDone}>
          Cancel
        </Button>
        <Button className="h-10" disabled={!ready} onClick={submit}>
          <Send />
          {review ? (revision ? `Send v${nextVersion} for review` : "Send for review") : "Mark ready to post"}
        </Button>
      </DialogFooter>
    </>
  );
}
