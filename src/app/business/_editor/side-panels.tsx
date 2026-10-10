"use client";

import { useState } from "react";
import { Heart, MessageCircle, Music2, Send } from "lucide-react";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { CreatorPhoto, CreatorStack } from "@/components/app/creator-photo";
import { MatchBreakdown } from "@/components/app/match-breakdown";
import { Photo } from "@/components/app/photo";
import { DataTag } from "@/components/app/status-badge";
import { creatorById } from "@/lib/domain/creators";
import { compact, usd } from "@/lib/domain/format";
import { CTAS } from "@/lib/domain/labels";
import { briefFor, exclusionSummary, guaranteeFloor, matchCreator, matchSet, recommendRoster, withPlatformFee } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import type { Activation, Campaign, CreatorSet, Platform } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Preview of what publishing would do for one set (or the live roster for an existing set). */
export function setForecast(campaign: Campaign, set: CreatorSet, budget: number, live: Activation[]) {
  const active = live.filter((a) => a.setId === set.id && ["accepted", "invited", "approved", "recommended"].includes(a.status) && !a.supplementary);
  if (active.length) {
    return { count: active.length, fees: withPlatformFee(sum(active.map((a) => a.fee))), views: [0, 1, 2].map((i) => sum(active.map((a) => a.estViews[i]))), lows: active.map((a) => a.estViews[0]), creators: active.map((a) => creatorById(a.creatorId)!), live: true };
  }
  const roster = recommendRoster(set, campaign, budget);
  return {
    count: roster.length,
    fees: withPlatformFee(sum(roster.map((m) => m.quote!.fee))),
    views: [0, 1, 2].map((i) => sum(roster.map((m) => m.quote!.estViews[i]))),
    lows: roster.map((m) => m.quote!.estViews[0]),
    creators: roster.map((m) => m.creator),
    live: false,
  };
}

function Card({ title, children, tag }: { title: string; children: React.ReactNode; tag?: React.ReactNode }) {
  return (
    <div className="surface p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        {title} {tag}
      </div>
      {children}
    </div>
  );
}

export function CampaignPanel({ campaign, sets, budgets, live }: { campaign: Campaign; sets: CreatorSet[]; budgets: Record<string, number>; live: Activation[] }) {
  const f = sets.map((s) => ({ s, ...setForecast(campaign, s, budgets[s.id], live) }));
  const fees = sum(f.map((x) => x.fees));
  const views = [0, 2].map((i) => sum(f.map((x) => x.views[i])));
  const floor = sum(f.map((x) => x.count)) >= 3 ? guaranteeFloor(f.flatMap((x) => x.lows)) : 0;
  return (
    <div className="space-y-4">
      <Card title="Campaign summary" tag={<DataTag kind="estimate" />}>
        <dl className="space-y-2 text-sm">
          <Row k="Budget" v={usd(campaign.budget)} />
          <Row k={`Creators (${sets.length} set${sets.length === 1 ? "" : "s"})`} v={`~${sum(f.map((x) => x.count))}`} />
          <Row k="Fees incl. platform fee" v={usd(fees)} />
          <Row k="Expected views" v={`${compact(views[0])}–${compact(views[1])}`} />
          <Row k="Guaranteed floor" v={floor ? compact(floor) : "3+ creators"} />
        </dl>
      </Card>
      <Card title="Budget by creator set">
        <ul className="space-y-3">
          {f.map((x) => (
            <li key={x.s.id}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-medium">{x.s.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">{usd(x.fees)} / {usd(budgets[x.s.id])}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (x.fees / Math.max(1, budgets[x.s.id])) * 100)}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">{campaign.allocation === "automatic" ? "Automatic allocation: unused budget moves to the best-performing sets for future invitations." : "Manual allocation per creator set."}</p>
      </Card>
    </div>
  );
}

export function SetPanel({ campaign, set, budget, live }: { campaign: Campaign; set: CreatorSet; budget: number; live: Activation[] }) {
  const { matches, excluded } = matchSet(set, campaign);
  const fc = setForecast(campaign, set, budget, live);
  const breadth = matches.length < 5 ? 0 : matches.length <= 15 ? 1 : 2;
  const reasons = exclusionSummary(excluded.filter((e) => set.niches.some((n) => e.creator.niches.includes(n)))).slice(0, 3);
  return (
    <div className="space-y-4">
      <Card title="Creator pool definition">
        <div className="text-xs text-muted-foreground">{["Your creator pool is very specific.", "Your creator pool is well defined.", "Your creator pool is broad."][breadth]}</div>
        <div className="mt-3 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1.5 rounded-full", i === breadth ? ["bg-warning", "bg-success", "bg-primary"][i] : "bg-muted")} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Specific</span>
          <span>Broad</span>
        </div>
        <div className="mt-3 text-sm">
          <span className="font-semibold tabular-nums">{matches.length}</span> <span className="text-muted-foreground">creators qualify</span>
        </div>
        {reasons.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
            {reasons.map(([r, n]) => (
              <li key={r}>{n} filtered out: {r.toLowerCase()}</li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={fc.live ? "Current roster" : "Estimated results"} tag={<DataTag kind="estimate" />}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{fc.count}</div>
            <div className="text-xs text-muted-foreground">{fc.live ? "creators on roster" : set.selection === "automatic" ? "creators invited at publish" : "creators recommended for review"}</div>
          </div>
          <CreatorStack creators={fc.creators} size={24} max={4} />
        </div>
        <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
          <Row k="Fees incl. platform fee" v={usd(fc.fees)} />
          <Row k="Expected views" v={`${compact(fc.views[0])}–${compact(fc.views[2])}`} />
          <Row k="Effective CPM" v={fc.views[1] ? usd((fc.fees / fc.views[1]) * 1000, true) : "—"} />
          <Row k="Budget for this set" v={usd(budget)} />
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Based on each creator&apos;s recent organic median views. Organic reach follows creators&apos; real audiences; it isn&apos;t precisely targeted like paid ads.</p>
      </Card>
    </div>
  );
}

export function AdPanel({ campaign, set }: { campaign: Campaign; set: CreatorSet }) {
  const b = briefFor(campaign, set);
  const [platform, setPlatform] = useState<Platform>(set.platforms[0] ?? "tiktok");
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Ad preview</span>
        <div className="inline-flex rounded-lg bg-muted p-0.5">
          {set.platforms.map((p) => (
            <button key={p} onClick={() => setPlatform(p)} className={cn("flex h-6 items-center gap-1 rounded-md px-2 text-xs", platform === p ? "bg-card shadow-card" : "text-muted-foreground")} aria-label={PLATFORMS[p].label}>
              <PlatformIcon platform={p} className="size-3" />
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto w-[240px] rounded-[28px] border-[6px] border-neutral-900 bg-neutral-900 shadow-float">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-neutral-800">
          <Photo src={campaign.promoting.image} alt="" sizes="240px" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
          {b.hooks[0] && <div className="absolute inset-x-4 top-16 rounded-lg bg-white px-2 py-1 text-center text-[12px] leading-tight font-semibold text-black">{b.hooks[0]}</div>}
          <div className="absolute right-2 bottom-24 flex flex-col items-center gap-3 text-white">
            <Heart className="size-5" />
            <MessageCircle className="size-5" />
            <Send className="size-5" />
          </div>
          <div className="absolute inset-x-3 bottom-3 space-y-1.5 text-white">
            <div className="text-[12px] font-semibold">@creator</div>
            <p className="line-clamp-2 text-[11px] leading-snug">
              {b.talkingPoints[0] ?? campaign.promoting.name} {b.requiredMentions.join(" ")}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-white/80">
              <Music2 className="size-3" /> Original sound
            </div>
            <div className="rounded-md bg-white/90 py-1 text-center text-[11px] font-semibold text-black">{CTAS[b.cta.type]}</div>
          </div>
          <span className="absolute top-3 left-3 rounded bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white">Sponsored · {campaign.businessName}</span>
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">Illustrative. Each creator films their own version in their voice.</p>
    </div>
  );
}

export function CreatorPanel({ campaign, set, activation }: { campaign: Campaign; set: CreatorSet; activation: Activation }) {
  const creator = creatorById(activation.creatorId)!;
  const m = matchCreator(creator, set, campaign);
  return (
    <div className="space-y-4">
      <div className="surface flex items-center gap-3 p-4">
        <CreatorPhoto creator={creator} size={44} />
        <div className="min-w-0">
          <div className="font-semibold">{creator.name}</div>
          <div className="text-xs text-muted-foreground">{creator.handle} · {creator.city}</div>
        </div>
      </div>
      <MatchBreakdown match={{ ...m, eligible: true }} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </div>
  );
}
