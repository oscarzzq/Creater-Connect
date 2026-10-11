"use client";

import Link from "next/link";
import { CalendarClock, Clock, Eye, FileCheck2, Package, ShieldCheck, Sparkles } from "lucide-react";
import { PlatformIcon } from "@/components/platform-icon";
import { Photo } from "@/components/app/photo";
import { DataTag, StatusPill } from "@/components/app/status-badge";
import { creatorById } from "@/lib/domain/creators";
import { compact, shortDate, usd } from "@/lib/domain/format";
import { matchCreator } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import {
  deadlineText,
  deliverablesLabel,
  dueLabel,
  expiryLabel,
  fulfillmentText,
  isUrgent,
  postNeedsCreator,
  reviewText,
  rightsText,
  statusFor,
  whyYou,
  type CreatorItem,
} from "./creator-data";
import { OfferActions } from "./offer-actions";

const linkFocus = "outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function matchFor(item: CreatorItem) {
  const creator = creatorById(item.activation.creatorId);
  return creator && item.set ? matchCreator(creator, item.set, item.campaign) : null;
}

/** Big, image-led card for an open offer. */
export function NewOfferCard({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c } = item;
  const match = matchFor(item);
  const href = `/creator/offers/${a.id}`;
  const urgent = isUrgent(a.expiresAt);
  const rights = rightsText(c.brief, c.businessName);
  const ship = fulfillmentText(c.brief);
  const review = reviewText(c.brief, c.businessName);

  return (
    <article className="surface flex flex-col overflow-hidden">
      <Link href={href} className={cn("group block rounded-t-xl", linkFocus)} aria-label={`${c.businessName}: ${c.promoting.name}, ${usd(a.fee)}. View offer`}>
        <div className="relative aspect-[16/9] overflow-hidden bg-muted">
          <Photo src={c.promoting.image} alt={c.promoting.name} sizes="(min-width: 768px) 480px, 100vw" className="transition-transform duration-700 group-hover:scale-[1.03]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-black/45 px-2 text-[11px] font-medium text-white backdrop-blur-sm">
              <PlatformIcon platform={a.platform} className="size-3 text-white" />
              {deliverablesLabel(c.brief, a.platform)}
            </span>
            <span className={cn("inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium backdrop-blur-sm", urgent ? "bg-warning text-black" : "bg-black/45 text-white")}>
              <Clock className="size-3" />
              {expiryLabel(a.expiresAt)}
            </span>
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-center gap-2.5 text-white">
            <BrandMark campaign={c} size="md" className="ring-2 ring-white/20" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{c.businessName}</div>
              <div className="truncate text-xs text-white/80">{c.promoting.name}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base leading-snug font-semibold tracking-tight">{c.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {deliverablesLabel(c.brief, a.platform)} · {c.brief.videoLength}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-3xl leading-none font-semibold tracking-tight tabular-nums">{usd(a.fee)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">fixed payout</div>
            </div>
          </div>

          <ul className="space-y-1.5 text-[13px] text-foreground/80">
            <li className="flex items-center gap-2">
              <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" />
              {deadlineText(item)}
            </li>
            <li className="flex items-center gap-2">
              <FileCheck2 className="size-3.5 shrink-0 text-muted-foreground" />
              {review.title}
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
              <span className={cn(c.brief.rights.paidUsage && "font-medium text-foreground")}>{rights.title}</span>
            </li>
            <li className="flex items-center gap-2">
              <Package className="size-3.5 shrink-0 text-muted-foreground" />
              {ship.title}
            </li>
          </ul>

          {match && (
            <p className="flex gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-[13px] leading-relaxed">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span>
                <span className="font-medium">Why you: </span>
                <span className="text-foreground/80">{whyYou(match.summary)}</span>
              </span>
            </p>
          )}
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="size-3.5" />
            Brands expect ~{compact(a.estViews[1])} views
            <DataTag kind="estimate" />
          </p>
        </div>
      </Link>

      <div className="mt-auto border-t p-3 sm:px-5 sm:py-4">
        <OfferActions item={item} />
      </div>
    </article>
  );
}

/** Compact row for the Active, Completed and Declined tabs. */
export function OfferRow({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c, posts } = item;
  const status = statusFor(item);
  const closed = item.status !== "accepted";
  const live = posts.filter((p) => p.status === "published" || p.status === "verified").length;
  const views = sum(posts.filter((p) => p.status === "verified").map((p) => p.metrics?.views ?? 0));
  const next = posts.filter(postNeedsCreator).sort((x, y) => x.dueAt.localeCompare(y.dueAt))[0];

  let detail: string;
  if (item.status === "expired") detail = "Expired before you replied";
  else if (item.status === "declined") detail = a.declineReason ? `You declined: ${a.declineReason}` : "You declined";
  else if (item.paidAt) detail = `Paid ${shortDate(item.paidAt)}${views ? ` · ${compact(views)} verified views` : ""}`;
  else if (item.phase === "receive") detail = a.fulfillment === "shipped" ? "Product on its way · confirm when it arrives" : "Brand is preparing your product";
  else if (item.phase === "in_review") detail = `Draft in review with ${c.businessName}`;
  else if (item.phase === "verifying") detail = "Verifying your posts · up to 48h";
  else if (next) detail = dueLabel(next.dueAt);
  else detail = `${live}/${posts.length} published`;

  return (
    <Link href={`/creator/offers/${a.id}`} className={cn("surface flex items-center gap-3 p-3 transition-shadow hover:shadow-float sm:gap-4 sm:p-4", linkFocus)}>
      <span className={cn("relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-16", closed && "opacity-60 grayscale")}>
        <Photo src={c.promoting.image} alt="" sizes="128px" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <BrandMark campaign={c} size="xs" />
          <span className="truncate">{c.businessName}</span>
          <PlatformIcon platform={a.platform} className="size-3" />
        </div>
        <div className="mt-0.5 truncate text-sm font-semibold">{c.name}</div>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
        </div>
        {!closed && !item.paidAt && posts.length > 0 && (
          <div className="mt-2 flex items-center gap-2" aria-label={`${live} of ${posts.length} posts published`}>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success" style={{ width: `${(live / posts.length) * 100}%` }} />
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {live}/{posts.length}
            </span>
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className={cn("text-lg font-semibold tracking-tight tabular-nums", closed && "text-muted-foreground line-through decoration-1")}>{usd(a.fee)}</div>
        {item.todo > 0 && <div className="mt-0.5 text-[11px] font-medium text-primary">{item.todo} to do</div>}
      </div>
    </Link>
  );
}
