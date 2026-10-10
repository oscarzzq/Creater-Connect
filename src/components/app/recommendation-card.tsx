"use client";

import { Check, MapPin, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { COUNTRY_FLAGS, compact, usd } from "@/lib/domain/format";
import { NICHE_LABEL } from "@/lib/domain/labels";
import type { MatchResult } from "@/lib/domain/matching";
import type { Activation } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Photo } from "./photo";
import { CreatorPhoto } from "./creator-photo";
import { FactorBars, MatchRing } from "./match-breakdown";
import { ActivationBadge } from "./status-badge";

/** Creator recommendation with everything needed to approve a fixed-fee offer. */
export function RecommendationCard({
  match,
  activation,
  onOpen,
  onApprove,
  onRemove,
  onUndo,
  readOnly,
}: {
  match: MatchResult;
  activation: Pick<Activation, "status" | "fee" | "estViews" | "platform" | "replacementFor" | "supplementary">;
  onOpen: () => void;
  onApprove?: () => void;
  onRemove?: () => void;
  onUndo?: () => void;
  readOnly?: boolean;
}) {
  const c = match.creator;
  const q = match.quote;
  const stats = q?.stats;
  const approved = activation.status === "approved";
  const pending = activation.status === "recommended";
  const topGeo = c.audience.topCountries[0];

  return (
    <div
      className={cn(
        "group surface relative flex flex-col overflow-hidden transition-[box-shadow,border-color] hover:border-foreground/15 hover:shadow-float",
        approved && "border-primary/60 ring-1 ring-primary/40"
      )}
    >
      <button type="button" onClick={onOpen} className="grid h-24 grid-cols-3 gap-0.5 bg-muted text-left" aria-label={`Open ${c.name}'s profile`}>
        {c.samples.map((s) => (
          <span key={s} className="relative overflow-hidden">
            <Photo src={s} alt="" sizes="120px" className="transition-transform duration-500 group-hover:scale-105" />
          </span>
        ))}
      </button>
      {activation.replacementFor && pending && (
        <span className="absolute top-2 left-2 rounded-md bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-black">Replacement</span>
      )}
      <div className="flex flex-1 flex-col px-4 pb-4">
        <div className="-mt-6 flex items-end justify-between">
          <button type="button" onClick={onOpen} aria-label={`Open ${c.name}'s profile`}>
            <CreatorPhoto creator={c} size={48} className="ring-4 ring-card" />
          </button>
          <MatchRing score={match.score} size={36} />
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <button type="button" onClick={onOpen} className="truncate font-semibold tracking-tight hover:underline">
            {c.name}
          </button>
          <PlatformIcon platform={activation.platform} className="size-3.5" />
          {!pending && !approved && <span className="ml-auto"><ActivationBadge status={activation.status} supplementary={activation.supplementary} /></span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{NICHE_LABEL[c.niches[0]]}</span>
          <span className="inline-flex items-center gap-0.5">
            <MapPin className="size-3" />
            {COUNTRY_FLAGS[c.country]} {c.city}
          </span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Audience: {c.audience.femalePct}% women · {topGeo ? `${topGeo.pct}% ${topGeo.code}` : ""} {c.audience.verified && <span className="text-success-text">· verified</span>}
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div>
            <dt className="text-[10px] text-muted-foreground">Median views</dt>
            <dd className="text-sm font-semibold tabular-nums">{stats ? compact(stats.medianViews) : "—"}</dd>
            {stats && <dd className="text-[10px] text-muted-foreground tabular-nums">{compact(stats.p25)}–{compact(stats.p75)}</dd>}
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">Est. views</dt>
            <dd className="text-sm font-semibold tabular-nums">{compact(activation.estViews[1])}</dd>
            <dd className="text-[10px] text-muted-foreground tabular-nums">{compact(activation.estViews[0])}–{compact(activation.estViews[2])}</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground">Effective CPM</dt>
            <dd className="text-sm font-semibold tabular-nums">{q ? usd(q.ecpm, true) : "—"}</dd>
            <dd className="text-[10px] text-muted-foreground">{PLATFORMS[activation.platform].short}</dd>
          </div>
        </dl>

        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-foreground/80">
          <Sparkles className="mr-1 -mt-0.5 inline size-3 text-primary" />
          {match.summary}
        </p>
        <FactorBars match={match} className="mt-3" />
        {c.pastBrands.length > 0 && <p className="mt-2 truncate text-[11px] text-muted-foreground">Worked with {c.pastBrands.slice(0, 3).join(", ")}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div>
            <div className="text-base font-semibold tabular-nums">{usd(activation.fee)}</div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              fixed fee {activation.supplementary ? "· covered by us" : ""}
            </div>
          </div>
          {!readOnly && pending && (
            <div className="flex gap-1.5">
              <Button size="icon-sm" variant="outline" aria-label={`Remove ${c.name}`} onClick={onRemove}>
                <X />
              </Button>
              <Button size="sm" onClick={onApprove}>
                <Check />
                Approve
              </Button>
            </div>
          )}
          {!readOnly && approved && (
            <button type="button" onClick={onUndo} className="inline-flex items-center gap-1 rounded-md bg-brand-subtle px-2 py-1 text-xs font-medium text-brand-subtle-foreground hover:bg-brand-subtle/70">
              <Check className="size-3.5" />
              Approved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
