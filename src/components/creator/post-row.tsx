"use client";

import { useState } from "react";
import { Clock, ExternalLink, Eye, Film, FlaskConical, Heart, MessageCircle, MessageSquareWarning, MousePointerClick, PackageCheck, Radio, Share2, ShieldCheck, Truck, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { Photo } from "@/components/app/photo";
import { DataTag, StatusPill } from "@/components/app/status-badge";
import { actions } from "@/lib/store";
import { compact, daysBetween, shortDate, TODAY } from "@/lib/domain/format";
import type { Activation, Campaign, Post } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CREATOR_POST_STATUS, dueLabel, needsReceipt } from "./creator-data";
import { PublishDialog } from "./publish-dialog";
import { SubmitDialog } from "./submit-dialog";

/** Holds the submit / publish dialogs for a list of post rows. */
export function usePostDialogs(campaigns: Campaign[]) {
  const [submitting, setSubmitting] = useState<Post | null>(null);
  const [publishing, setPublishing] = useState<Post | null>(null);
  const find = (p: Post | null) => (p ? campaigns.find((c) => c.id === p.campaignId) : undefined);
  return {
    onSubmit: setSubmitting,
    onPublish: setPublishing,
    dialogs: (
      <>
        <SubmitDialog post={submitting} campaign={find(submitting)} open={!!submitting} onOpenChange={(o) => !o && setSubmitting(null)} />
        <PublishDialog post={publishing} campaign={find(publishing)} open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)} />
      </>
    ),
  };
}

export function confirmReceived(a: Activation, c: Campaign) {
  actions.confirmReceived(a.id);
  toast.success(c.brief.fulfillment.kind === "ship" ? "Marked as received" : "Access confirmed", { description: "You're clear to start creating." });
}

/** Activation-level banner while the product or access hasn't been confirmed. */
export function ReceiveBanner({ activation, campaign, className }: { activation: Activation; campaign: Campaign; className?: string }) {
  if (!needsReceipt(activation, campaign)) return null;
  const ship = campaign.brief.fulfillment.kind === "ship";
  const shipped = activation.fulfillment === "shipped";
  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:flex-row sm:items-center", className)}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card ring-1 ring-border">
        <Truck className="size-4 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <div className="font-medium">{ship ? (shipped ? "Your product is on its way" : `${campaign.businessName} is preparing your product`) : "Access is being set up"}</div>
        <div className="text-xs text-muted-foreground">{campaign.brief.fulfillment.details}</div>
      </div>
      <Button className="h-9 shrink-0 rounded-lg" onClick={() => confirmReceived(activation, campaign)}>
        <PackageCheck />
        I&apos;ve received it
      </Button>
    </div>
  );
}

export function PostRow({
  post,
  activation,
  campaign,
  total,
  onSubmit,
  onPublish,
}: {
  post: Post;
  activation: Activation;
  campaign: Campaign;
  total: number;
  onSubmit: (p: Post) => void;
  onPublish: (p: Post) => void;
}) {
  const status = CREATOR_POST_STATUS[post.status];
  const brand = campaign.businessName;
  const review = campaign.brief.review.required;
  const blocked = needsReceipt(activation, campaign);
  const open = post.status === "not_started" || post.status === "revision_requested" || post.status === "approved";
  const overdue = open && daysBetween(TODAY, post.dueAt) < 0;
  const what = `${PLATFORMS[post.platform].format}${total > 1 ? ` ${post.index} of ${total}` : ""}`;

  let meta: string;
  if (post.status === "not_started") meta = blocked ? `Waiting for the product · ${dueLabel(post.dueAt)}` : dueLabel(post.dueAt);
  else if (post.status === "draft_submitted")
    meta = `Submitted ${shortDate(post.submittedAt!)} · ${brand} replies${campaign.brief.review.turnaroundDays ? ` within ${campaign.brief.review.turnaroundDays}d` : " soon"}`;
  else if (post.status === "revision_requested") meta = dueLabel(post.dueAt);
  else if (post.status === "approved") meta = `${review && post.approvedAt ? `Approved ${shortDate(post.approvedAt)} · ` : ""}post by ${shortDate(post.dueAt)}`;
  else if (post.status === "published") meta = `Published ${shortDate(post.publishedAt!)} · verifying, up to 48h`;
  else meta = `Verified ${shortDate(post.verifiedAt ?? post.publishedAt!)}`;

  let action: React.ReactNode = null;
  if (post.status === "not_started" && !blocked)
    action = (
      <Button className="h-9 rounded-lg" onClick={() => onSubmit(post)} aria-label={`${review ? "Submit draft" : "Mark ready"}: ${what} for ${campaign.name}`}>
        <Upload />
        {review ? "Submit draft" : "Mark ready"}
      </Button>
    );
  else if (post.status === "revision_requested")
    action = (
      <Button className="h-9 rounded-lg" onClick={() => onSubmit(post)} aria-label={`Upload version ${post.version + 1}: ${what} for ${campaign.name}`}>
        <Upload />
        Upload v{post.version + 1}
      </Button>
    );
  else if (post.status === "approved")
    action = (
      <Button className="h-9 rounded-lg" onClick={() => onPublish(post)} aria-label={`Publish and submit link: ${what} for ${campaign.name}`}>
        <Radio />
        Publish &amp; add link
      </Button>
    );

  const m = post.metrics;

  return (
    <li className="flex gap-3 p-4">
      <span className="relative aspect-[9/16] w-12 shrink-0 overflow-hidden rounded-md bg-muted sm:w-14">
        {post.status === "not_started" ? (
          <span className="flex size-full items-center justify-center text-muted-foreground/70">
            <Film className="size-4" />
          </span>
        ) : (
          <Photo src={post.thumbnail} alt={post.caption || what} sizes="112px" />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <PlatformIcon platform={post.platform} className="size-3.5" />
                {what}
              </span>
              {post.version > 1 && <span className="rounded border px-1 text-[10px] font-medium text-muted-foreground tabular-nums">v{post.version}</span>}
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <div className={cn("mt-1 text-xs text-muted-foreground", overdue && "font-medium text-destructive-text")}>{meta}</div>
            {post.caption && post.status !== "not_started" && <p className="mt-1 line-clamp-1 text-xs text-foreground/70">“{post.caption}”</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>

        {post.status === "revision_requested" && post.revisionNote && (
          <div className="rounded-lg border border-destructive/25 bg-destructive-subtle/60 p-3 text-sm">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive-text">
              <MessageSquareWarning className="size-3.5" />
              {brand} asked for changes on v{post.version}
            </div>
            <p className="mt-1 text-foreground/85">{post.revisionNote}</p>
          </div>
        )}

        {post.status === "published" && (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5" />
                Verifying (up to 48h). Checking the post is live and organic; views appear once verified.
              </span>
              {post.url && <PostLink url={post.url} />}
            </div>
            <Button
              variant="ghost"
              size="xs"
              className="text-muted-foreground"
              aria-label={`Simulate verification for ${what} (demo only)`}
              onClick={() => {
                actions.verifyPost(post.id);
                toast.success("Post verified (demo)", { description: "Views now come from the platform. You're paid once every post is verified." });
              }}
            >
              <FlaskConical />
              Simulate verification (demo)
            </Button>
          </div>
        )}

        {post.status === "verified" && m && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <DataTag kind="verified" />
            <Metric icon={Eye} value={m.views} label="views" />
            <Metric icon={Heart} value={m.likes} label="likes" />
            <Metric icon={MessageCircle} value={m.comments} label="comments" />
            <Metric icon={Share2} value={m.shares} label="shares" />
            {m.clicks > 0 && <Metric icon={MousePointerClick} value={m.clicks} label="link clicks" />}
            {post.url && <PostLink url={post.url} />}
          </div>
        )}
      </div>
    </li>
  );
}

function Metric({ icon: Icon, value, label }: { icon: React.ComponentType<{ className?: string }>; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="font-medium">{compact(value)}</span> {label}
    </span>
  );
}

function PostLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className="ml-auto inline-flex items-center gap-1 rounded font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
      View post
      <ExternalLink className="size-3" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

/** One-line reassurance used wherever the payout is shown. */
export function PayoutGuarantee({ className }: { className?: string }) {
  return (
    <p className={cn("flex gap-2 text-xs text-muted-foreground", className)}>
      <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" />
      <span>You get your full fee for properly completed deliverables, even if views come in lower than expected. View risk is handled by the platform, not you.</span>
    </p>
  );
}
