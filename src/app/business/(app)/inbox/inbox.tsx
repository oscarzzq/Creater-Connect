"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle, ArrowRight, Check, CheckCheck, CircleDollarSign, Eye, FileUp, Inbox as InboxIcon, MailOpen, MessageSquare,
  Radio, RefreshCw, Send, ShieldCheck, Sparkles, UserCheck, UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, relative, shortDate, usd } from "@/lib/domain/format";
import { REMEDIES } from "@/lib/domain/labels";
import { campaignRollup, projectedViews, type InboxCategory, type InboxItem } from "@/lib/domain/metrics";
import { BUSINESS } from "@/lib/domain/seed";
import { cn } from "@/lib/utils";
import { useInbox } from "@/components/app/business-shell";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { useOverlays } from "@/components/app/overlays";
import { Photo } from "@/components/app/photo";
import { EmptyState } from "@/components/app/section";
import { DataTag, PostBadge } from "@/components/app/status-badge";

type Cat = "all" | "action" | InboxCategory;

const CATS: [Cat, string][] = [
  ["all", "All"],
  ["action", "Needs action"],
  ["offers", "Creator offers"],
  ["content", "Content reviews"],
  ["messages", "Messages"],
  ["updates", "Updates"],
];

const KIND_ICON: Record<InboxItem["kind"], { icon: typeof Eye; tone: string }> = {
  review_recommendations: { icon: Sparkles, tone: "bg-brand-subtle text-brand-subtle-foreground" },
  replacement: { icon: RefreshCw, tone: "bg-warning-subtle text-warning-text" },
  accepted: { icon: UserCheck, tone: "bg-success-subtle text-success-text" },
  declined: { icon: UserX, tone: "bg-muted text-muted-foreground" },
  invited: { icon: Send, tone: "bg-muted text-muted-foreground" },
  draft: { icon: FileUp, tone: "bg-warning-subtle text-warning-text" },
  revision: { icon: RefreshCw, tone: "bg-muted text-muted-foreground" },
  published: { icon: Radio, tone: "bg-brand-subtle text-brand-subtle-foreground" },
  verified: { icon: Check, tone: "bg-success-subtle text-success-text" },
  message: { icon: MessageSquare, tone: "bg-brand-subtle text-brand-subtle-foreground" },
  guarantee_risk: { icon: AlertTriangle, tone: "bg-destructive-subtle text-destructive-text" },
  make_good: { icon: ShieldCheck, tone: "bg-warning-subtle text-warning-text" },
  completed: { icon: CheckCheck, tone: "bg-success-subtle text-success-text" },
  paid: { icon: CircleDollarSign, tone: "bg-success-subtle text-success-text" },
};

export function Inbox() {
  const world = useAppState();
  const { items } = useInbox();
  const search = useSearchParams();
  const router = useRouter();
  const [cat, setCat] = useState<Cat>((search.get("cat") as Cat) ?? (search.get("item") ? "all" : "action"));
  const [campaignId, setCampaignId] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(search.get("item"));
  const own = world.campaigns.filter((c) => c.businessId === BUSINESS.id);

  const list = useMemo(
    () =>
      items.filter((i) => {
        if (cat === "action" && !i.needsAction) return false;
        if (cat !== "all" && cat !== "action" && i.category !== cat) return false;
        if (campaignId !== "all" && i.campaignId !== campaignId) return false;
        if (unreadOnly && world.inbox.read[i.id]) return false;
        return true;
      }),
    [items, cat, campaignId, unreadOnly, world.inbox.read]
  );
  const selected = items.find((i) => i.id === selectedId) ?? list[0];

  function select(i: InboxItem) {
    setSelectedId(i.id);
    if (!world.inbox.read[i.id]) actions.markRead([i.id]);
    router.replace(`/business/inbox?item=${i.id}`, { scroll: false });
  }

  const counts = (c: Cat) => items.filter((i) => (c === "all" ? true : c === "action" ? i.needsAction : i.category === c)).length;
  const unread = (c: Cat) => items.filter((i) => !world.inbox.read[i.id] && (c === "all" ? true : c === "action" ? i.needsAction : i.category === c)).length;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Offers, approvals, creator messages and campaign updates in one place.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { actions.markRead(list.map((i) => i.id)); toast("Marked as read"); }}>
          <MailOpen />
          Mark all read
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {CATS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setCat(key)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-card hover:text-foreground", cat === key && "border-foreground/20 bg-foreground text-background hover:text-background")}
            >
              {label}
              <span className="opacity-60 tabular-nums">{counts(key)}</span>
              {unread(key) > 0 && key !== "all" && <span className="size-1.5 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" className="size-3.5 accent-(--primary)" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
            Unread only
          </label>
          <Select value={campaignId} onValueChange={setCampaignId}>
            <SelectTrigger size="sm" className="h-8 w-48 bg-card text-xs shadow-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All campaigns</SelectItem>
              {own.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid overflow-hidden rounded-xl border bg-card shadow-card lg:h-[calc(100dvh-14rem)] lg:grid-cols-[380px_1fr]">
        <ul className="divide-y overflow-y-auto border-b lg:border-r lg:border-b-0">
          {list.map((i) => {
            const creator = i.creatorId ? creatorById(i.creatorId) : undefined;
            const K = KIND_ICON[i.kind];
            const isRead = world.inbox.read[i.id];
            return (
              <li key={i.id}>
                <button onClick={() => select(i)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40", selected?.id === i.id && "bg-brand-subtle/50")}>
                  <span className="relative mt-0.5 shrink-0">
                    {creator ? <CreatorPhoto creator={creator} size={32} /> : <span className={cn("flex size-8 items-center justify-center rounded-full", K.tone)}><K.icon className="size-4" /></span>}
                    {creator && (
                      <span className={cn("absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-md ring-2 ring-card", K.tone)}>
                        <K.icon className="size-2.5" />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={cn("truncate text-sm", isRead ? "text-foreground/80" : "font-semibold")}>{i.title}</span>
                      {!isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{i.body}</span>
                    {i.needsAction && <span className="mt-1 inline-block rounded bg-warning-subtle px-1.5 text-[10px] font-medium text-warning-text">Needs action</span>}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relative(i.at)}</span>
                </button>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="p-6">
              <EmptyState icon={InboxIcon} title="Nothing here" description={cat === "action" ? "You're all caught up." : "No items match these filters."} className="border-0" />
            </li>
          )}
        </ul>
        <div className="min-h-[420px] overflow-y-auto">{selected ? <Detail key={selected.id} item={selected} /> : null}</div>
      </div>
    </div>
  );
}

function Detail({ item }: { item: InboxItem }) {
  const world = useAppState();
  const { openPost, openActivation, openCreator } = useOverlays();
  const [reply, setReply] = useState("");
  const campaign = world.campaigns.find((c) => c.id === item.campaignId)!;
  const act = item.activationId ? world.activations.find((a) => a.id === item.activationId) : undefined;
  const post = item.postId ? world.posts.find((p) => p.id === item.postId) : undefined;
  const creator = item.creatorId ? creatorById(item.creatorId) : undefined;
  const K = KIND_ICON[item.kind];
  const resolvable = item.needsAction && ["message", "guarantee_risk"].includes(item.kind);

  return (
    <div className="p-6">
      <div className="flex items-start gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", K.tone)}>
          <K.icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground">
            <Link href={`/business/campaigns/${campaign.id}`} className="hover:text-foreground hover:underline">{campaign.name}</Link> · {relative(item.at)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => actions.markUnread(item.id)}>
          Mark unread
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        {/* Recommendations ready */}
        {item.kind === "review_recommendations" && (
          <div className="surface p-4 text-sm">
            <p>This creator set uses manual review. Approve the creators you want; their fixed-fee offers go out as soon as you approve.</p>
            <Button asChild className="mt-3">
              <Link href={`/business/campaigns/${campaign.id}?tab=sets${item.setId ? `&set=${item.setId}` : ""}`}>
                Review creators <ArrowRight />
              </Link>
            </Button>
          </div>
        )}

        {/* Replacement */}
        {item.kind === "replacement" && act && creator && (
          <ReplacementCard actId={act.id} />
        )}

        {/* Draft review */}
        {(item.kind === "draft" || item.kind === "revision" || item.kind === "published" || item.kind === "verified") && post && (
          <div className="surface flex gap-4 p-4">
            <button onClick={() => openPost(post.id)} className="relative aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-lg bg-muted" aria-label="Open post">
              <Photo src={post.thumbnail} alt="" sizes="120px" />
            </button>
            <div className="min-w-0 flex-1 space-y-2 text-sm">
              <PostBadge status={post.status} />
              <p className="font-medium">{post.caption || "Untitled draft"}</p>
              {post.revisionNote && post.status === "revision_requested" && <p className="rounded-lg bg-muted p-2 text-xs">Your note: {post.revisionNote}</p>}
              {post.metrics && post.metrics.views > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {compact(post.metrics.views)} views {post.status === "verified" ? <DataTag kind="verified" /> : "(verifying)"}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {post.status === "draft_submitted" ? (
                  <>
                    <Button size="sm" onClick={() => openPost(post.id)}>
                      <Eye /> Review draft
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { actions.approvePost(post.id); toast.success("Approved", { description: `${creator?.name.split(" ")[0]} can publish now.` }); }}>
                      <Check /> Approve
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => openPost(post.id)}>Open post</Button>
                )}
                {act && <Button size="sm" variant="ghost" onClick={() => openActivation(act.id)}>View activation</Button>}
              </div>
            </div>
          </div>
        )}

        {/* Message thread */}
        {item.kind === "message" && act && (
          <div className="surface p-4">
            <ul className="space-y-2">
              {act.messages.map((m) => (
                <li key={m.id} className={cn("max-w-[85%] rounded-xl px-3 py-2 text-sm", m.from === "business" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted")}>
                  {m.text}
                  <div className={cn("mt-0.5 text-[10px]", m.from === "business" ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.from === "business" ? "You" : creator?.name.split(" ")[0]} · {relative(m.at)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} className="resize-none" placeholder={`Reply to ${creator?.name.split(" ")[0]}`} />
              <Button
                size="icon"
                className="size-9 self-end"
                aria-label="Send reply"
                disabled={!reply.trim()}
                onClick={() => { actions.reply(act.id, reply.trim()); setReply(""); toast("Reply sent"); }}
              >
                <Send />
              </Button>
            </div>
          </div>
        )}

        {/* Guarantee */}
        {(item.kind === "guarantee_risk" || item.kind === "make_good") && campaign.guarantee && (
          <GuaranteeCard campaignId={campaign.id} />
        )}

        {/* Offer status updates */}
        {["accepted", "declined", "invited", "paid"].includes(item.kind) && act && creator && (
          <div className="surface flex items-center gap-3 p-4 text-sm">
            <button onClick={() => openCreator(creator.id, act.setId)}>
              <CreatorPhoto creator={creator} size={40} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{creator.name}</div>
              <div className="text-xs text-muted-foreground">{usd(act.fee)} fixed fee · ~{compact(act.estViews[1])} expected views{act.expiresAt && act.status === "invited" ? ` · expires ${shortDate(act.expiresAt)}` : ""}</div>
              {act.declineReason && <div className="mt-1 text-xs">“{act.declineReason}”</div>}
            </div>
            <Button size="sm" variant="outline" onClick={() => openActivation(act.id)}>View activation</Button>
          </div>
        )}

        {item.kind === "completed" && (
          <div className="surface p-4 text-sm">
            {item.body}
            <Button asChild variant="outline" size="sm" className="ml-3">
              <Link href={`/business/campaigns/${campaign.id}`}>View report</Link>
            </Button>
          </div>
        )}

        {resolvable && (
          <Button variant="ghost" size="sm" onClick={() => { actions.resolve(item.id); toast("Marked resolved"); }}>
            <CheckCheck /> Mark resolved
          </Button>
        )}
      </div>
    </div>
  );
}

function ReplacementCard({ actId }: { actId: string }) {
  const world = useAppState();
  const { openCreator } = useOverlays();
  const act = world.activations.find((a) => a.id === actId);
  if (!act) return null;
  const creator = creatorById(act.creatorId)!;
  const old = world.activations.find((a) => a.id === act.replacementFor);
  const oldCreator = old && creatorById(old.creatorId);
  const set = world.sets.find((s) => s.id === act.setId);
  if (act.status !== "recommended") {
    return <p className="surface p-4 text-sm text-muted-foreground">Handled. {creator.name} is now {act.status === "invited" ? "invited" : act.status}.</p>;
  }
  return (
    <div className="surface overflow-hidden">
      {old && (
        <div className="border-b bg-muted/40 px-4 py-3 text-sm">
          {oldCreator?.name} declined{old.declineReason ? `: “${old.declineReason}”` : "."} Their {usd(old.fee)} slot in “{set?.name}” needs a replacement.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button onClick={() => openCreator(creator.id, act.setId)}>
          <CreatorPhoto creator={creator} size={48} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{creator.name} <span className="text-sm font-normal text-muted-foreground">{creator.handle}</span></div>
          <div className="text-xs text-muted-foreground">
            Fit {act.matchScore} · {usd(act.fee)} fixed fee · ~{compact(act.estViews[1])} views ({compact(act.estViews[0])}–{compact(act.estViews[2])})
          </div>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t px-4 py-3">
        <Button size="sm" variant="ghost" onClick={() => openCreator(creator.id, act.setId)}>View profile</Button>
        <Button size="sm" variant="outline" onClick={() => { actions.nextReplacement(act.id); toast("Suggested another comparable creator"); }}>
          <RefreshCw /> Suggest another
        </Button>
        <Button size="sm" onClick={() => { actions.approve([act.id]); toast.success(`${creator.name} invited`, { description: "They have 7 days to accept." }); }}>
          <Check /> Approve & invite
        </Button>
      </div>
    </div>
  );
}

function GuaranteeCard({ campaignId }: { campaignId: string }) {
  const world = useAppState();
  const c = world.campaigns.find((x) => x.id === campaignId)!;
  const r = campaignRollup(c, world);
  const projected = projectedViews(c, world);
  const g = c.guarantee!;
  return (
    <div className="surface p-4 text-sm">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">Delivered <DataTag kind="verified" /></div>
          <div className="text-lg font-semibold tabular-nums">{compact(r.views)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">Guaranteed <DataTag kind="guaranteed" /></div>
          <div className="text-lg font-semibold tabular-nums">{compact(g.minViews)}</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">Projected <DataTag kind="estimate" /></div>
          <div className="text-lg font-semibold tabular-nums">{compact(Math.max(projected, r.views))}</div>
        </div>
      </div>
      <p className="mt-3 text-muted-foreground">
        {c.makeGood ? `${c.makeGood.reason} ${c.makeGood.remedy}` : `If verified views fall short within the ${g.windowDays}-day window, the agreed remedy applies: ${REMEDIES[g.remedy].toLowerCase()}. You don't need to do anything yet.`}
      </p>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href={`/business/campaigns/${c.id}`}>Open campaign</Link>
      </Button>
    </div>
  );
}
