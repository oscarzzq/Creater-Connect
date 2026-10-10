"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, relative, shortDate, usd } from "@/lib/domain/format";
import { ACTIVATION_STATUS } from "@/lib/domain/labels";
import { PLATFORM_FEE_RATE } from "@/lib/domain/matching";
import { payment, sum } from "@/lib/domain/metrics";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "./creator-photo";
import { PostCard } from "./post-card";
import { ActivationBadge, DataTag } from "./status-badge";

export function ActivationSheet({
  activationId,
  open,
  onOpenChange,
  onOpenPost,
  onOpenCreator,
}: {
  activationId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenPost: (id: string) => void;
  onOpenCreator: (creatorId: string, setId: string) => void;
}) {
  const { activations, posts, campaigns, sets } = useAppState();
  const [draft, setDraft] = useState("");
  const a = activations.find((x) => x.id === activationId);
  if (!a) return null;
  const creator = creatorById(a.creatorId)!;
  const campaign = campaigns.find((c) => c.id === a.campaignId)!;
  const set = sets.find((s) => s.id === a.setId)!;
  const mine = posts.filter((p) => p.activationId === a.id).sort((x, y) => x.index - y.index);
  const pay = payment(a, posts);
  const verifiedViews = sum(mine.filter((p) => p.status === "verified").map((p) => p.metrics?.views ?? 0));
  const replaced = a.replacementFor ? activations.find((x) => x.id === a.replacementFor) : undefined;
  const first = creator.name.split(" ")[0];
  const fulfillmentNeeded = campaign.brief.fulfillment.kind !== "none";

  const steps: { label: string; at?: string; done: boolean; note?: string }[] = [
    { label: "Recommended by matching", done: true },
    { label: "Approved by you", at: a.approvedAt, done: !!a.approvedAt },
    { label: "Invited", at: a.invitedAt, done: !!a.invitedAt, note: a.status === "invited" && a.expiresAt ? `Expires ${shortDate(a.expiresAt)}` : undefined },
    { label: a.status === "declined" || a.status === "replacement_required" ? "Declined" : "Accepted", at: a.respondedAt, done: !!a.respondedAt && a.status === "accepted" },
    ...(fulfillmentNeeded ? [{ label: campaign.brief.fulfillment.kind === "ship" ? "Product delivered" : "Access granted", done: a.fulfillment === "delivered", note: a.fulfillment === "shipped" ? "Shipped" : undefined }] : []),
    { label: campaign.brief.review.required ? "Draft approved" : "Content created", at: mine.map((p) => p.approvedAt).filter(Boolean).sort()[0], done: mine.length > 0 && mine.every((p) => ["approved", "published", "verified"].includes(p.status)) },
    { label: "Published", at: mine.map((p) => p.publishedAt).filter(Boolean).sort()[0], done: mine.length > 0 && mine.every((p) => p.publishedAt) },
    { label: "Verified", at: mine.map((p) => p.verifiedAt).filter(Boolean).sort().at(-1), done: mine.length > 0 && mine.every((p) => p.status === "verified") },
    { label: a.supplementary ? "Paid by platform (make-good)" : "Creator paid", at: pay.paidAt, done: pay.state === "paid" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-[560px]">
        <div className="flex-1 overflow-y-auto">
          <div className="border-b p-6">
            <div className="flex items-start gap-3">
              <button onClick={() => onOpenCreator(creator.id, set.id)} aria-label={`Open ${creator.name}'s profile`}>
                <CreatorPhoto creator={creator} size={52} />
              </button>
              <div className="min-w-0 flex-1">
                <SheetTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
                  {creator.name}
                  <ActivationBadge status={a.status} supplementary={a.supplementary} />
                </SheetTitle>
                <SheetDescription className="mt-0.5">
                  <Link href={`/business/campaigns/${campaign.id}`} className="hover:text-foreground hover:underline">
                    {campaign.name}
                  </Link>{" "}
                  · {set.name}
                </SheetDescription>
                <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PlatformIcon platform={a.platform} className="size-3.5" />
                  {campaign.brief.deliverables} × {PLATFORMS[a.platform].format} · Next: {ACTIVATION_STATUS[a.status].owner}
                </div>
              </div>
            </div>
            {replaced && (
              <p className="mt-3 rounded-lg bg-warning-subtle/60 px-3 py-2 text-xs text-warning-text">
                Suggested replacement for {creatorById(replaced.creatorId)?.name}, who declined: “{replaced.declineReason}”
              </p>
            )}
            {a.declineReason && (a.status === "declined" || a.status === "replacement_required") && (
              <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Declined: “{a.declineReason}”</p>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-px border-b bg-border text-sm">
            <div className="bg-popover p-4">
              <dt className="text-xs text-muted-foreground">{a.supplementary ? "Fee (covered by us)" : "Fixed fee"}</dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{usd(a.fee)}</dd>
              {!a.supplementary && <dd className="text-[11px] text-muted-foreground tabular-nums">+{usd(a.fee * PLATFORM_FEE_RATE)} platform fee</dd>}
            </div>
            <div className="bg-popover p-4">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                Expected <DataTag kind="estimate" />
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">
                {compact(a.estViews[0])}–{compact(a.estViews[2])}
              </dd>
              <dd className="text-[11px] text-muted-foreground tabular-nums">~{compact(a.estViews[1])} views</dd>
            </div>
            <div className="bg-popover p-4">
              <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                Delivered <DataTag kind="verified" />
              </dt>
              <dd className="mt-0.5 font-semibold tabular-nums">{verifiedViews ? compact(verifiedViews) : "—"}</dd>
              {verifiedViews > 0 && <dd className="text-[11px] text-muted-foreground tabular-nums">{Math.round((verifiedViews / a.estViews[1]) * 100)}% of expected</dd>}
            </div>
          </dl>

          <section className="border-b p-6">
            <h3 className="mb-3 text-sm font-semibold">Status</h3>
            <ol className="space-y-2.5">
              {steps.map((s) => (
                <li key={s.label} className="flex items-center gap-3 text-sm">
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", s.done ? "border-success bg-success text-white" : "border-dashed bg-card")}>
                    {s.done && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className={cn("flex-1", !s.done && "text-muted-foreground")}>{s.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{s.note ?? (s.at ? shortDate(s.at) : "")}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">Creators are paid their full fee once posts are verified, whatever the view count. View risk sits with the platform guarantee.</p>
          </section>

          {mine.length > 0 && (
            <section className="border-b p-6">
              <h3 className="mb-3 text-sm font-semibold">Posts</h3>
              <div className="grid grid-cols-3 gap-3">
                {mine.map((p) => (
                  <PostCard key={p.id} post={p} size="sm" subtitle={mine.length > 1 ? `Post ${p.index} · due ${shortDate(p.dueAt)}` : `Due ${shortDate(p.dueAt)}`} onOpen={() => onOpenPost(p.id)} />
                ))}
              </div>
            </section>
          )}

          <section className="p-6">
            <h3 className="mb-3 text-sm font-semibold">Messages</h3>
            {a.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <ul className="space-y-2">
                {a.messages.map((m) => (
                  <li key={m.id} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.from === "business" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                    {m.text}
                    <div className={cn("mt-0.5 text-[10px]", m.from === "business" ? "text-primary-foreground/70" : "text-muted-foreground")}>{relative(m.at)}</div>
                  </li>
                ))}
              </ul>
            )}
            {!["recommended", "removed"].includes(a.status) && (
              <div className="mt-3 flex gap-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={`Message ${first}`} className="resize-none" />
                <Button
                  size="icon"
                  className="size-9 self-end"
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  onClick={() => {
                    actions.reply(a.id, draft.trim());
                    setDraft("");
                    toast(`Message sent to ${first}`);
                  }}
                >
                  <Send />
                </Button>
              </div>
            )}
          </section>
        </div>

        {(a.status === "recommended" || a.status === "approved") && (
          <div className="flex items-center justify-between gap-2 border-t bg-popover px-6 py-4">
            <Button variant="ghost" className="h-9" onClick={() => { actions.remove(a.id); toast(`${first} removed`); onOpenChange(false); }}>
              <X />
              Remove
            </Button>
            <div className="flex gap-2">
              {a.replacementFor && (
                <Button variant="outline" className="h-9" onClick={() => { actions.nextReplacement(a.id); toast("Showing the next comparable creator"); onOpenChange(false); }}>
                  <RefreshCw />
                  Suggest another
                </Button>
              )}
              {a.status === "recommended" && (
                <Button className="h-9" onClick={() => { actions.approve([a.id]); toast.success(campaign.status === "draft" ? `${first} approved` : `${first} invited`, { description: campaign.status === "draft" ? "They'll be invited when you launch." : "They have 7 days to accept." }); }}>
                  <Check />
                  {campaign.status === "draft" ? "Approve" : "Approve & invite"}
                </Button>
              )}
              {a.status === "approved" && (
                <Button variant="outline" className="h-9" onClick={() => actions.unapprove(a.id)}>
                  Undo approval
                </Button>
              )}
            </div>
          </div>
        )}
        {a.status === "accepted" && mine.some((p) => p.status === "draft_submitted") && (
          <div className="flex justify-end border-t bg-popover px-6 py-4">
            <Button className="h-9" onClick={() => onOpenPost(mine.find((p) => p.status === "draft_submitted")!.id)}>
              Review draft
              <ArrowRight />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
