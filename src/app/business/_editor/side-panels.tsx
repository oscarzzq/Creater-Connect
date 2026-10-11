"use client";

import { useState } from "react";
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
          <Row k="Fees incl. 1% Klynt fee" v={usd(fees)} />
          <Row k="Expected views" v={`${compact(views[0])}–${compact(views[1])}`} />
          <Row k="Guaranteed view floor" v={floor ? compact(floor) : "3+ creators"} />
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
              <div className="mt-1 h-1.5 overflow-hidden rounded-none bg-muted">
                <div className="h-full rounded-none bg-primary" style={{ width: `${Math.min(100, (x.fees / Math.max(1, budgets[x.s.id])) * 100)}%` }} />
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
            <span key={i} className={cn("h-1.5 rounded-none", i === breadth ? ["bg-warning", "bg-success", "bg-primary"][i] : "bg-muted")} />
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
            <div className="text-xs text-muted-foreground">{fc.live ? "creators on roster" : "creators matched at publish"}</div>
          </div>
          <CreatorStack creators={fc.creators} size={24} max={4} />
        </div>
        <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
          <Row k="Fees incl. 1% Klynt fee" v={usd(fc.fees)} />
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
  const [picked, setPlatform] = useState<Platform>(set.platforms[0] ?? "linkedin");
  const platform = set.platforms.includes(picked) ? picked : (set.platforms[0] ?? "linkedin");
  const body = `${b.hooks[0] ? `${b.hooks[0]}\n\n` : ""}${b.talkingPoints[0] ?? campaign.promoting.name}`;
  const mentions = b.requiredMentions.join(" ");
  const disclosure = platform === "linkedin" ? `Paid partnership with ${campaign.businessName}` : platform === "newsletter" ? `Sponsored by ${campaign.businessName}` : `Sponsored · ${campaign.businessName}`;
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
      <div className="mx-auto w-[260px] rounded-[28px] border-[6px] border-neutral-900 bg-neutral-900 shadow-float">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-white text-neutral-900">
          <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-2 text-[10px] font-medium text-neutral-500">
            <PlatformIcon platform={platform} className="size-3" />
            {PLATFORMS[platform].label}
          </div>
          {platform === "newsletter" ? (
            <div className="space-y-2 p-3 text-[11px] leading-snug">
              <div className="text-[13px] font-semibold">This week in AI · Issue #142</div>
              <p className="text-neutral-500">The creator&apos;s usual intro, in their voice…</p>
              <div className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2.5">
                <div className="text-[9px] font-semibold tracking-wide text-neutral-500 uppercase">{disclosure}</div>
                <div className="relative aspect-video overflow-hidden rounded-md bg-neutral-200">
                  <Photo src={campaign.promoting.image} alt="" sizes="240px" />
                </div>
                <p className="line-clamp-4 whitespace-pre-line">{body}</p>
                <div className="rounded-md bg-neutral-900 py-1 text-center text-[10px] font-semibold text-white">{CTAS[b.cta.type]}</div>
              </div>
              <p className="text-neutral-500">…and back to the rest of the issue.</p>
            </div>
          ) : (
            <div className="space-y-2 p-3 text-[11px] leading-snug">
              <div className="flex items-center gap-2">
                <span className="size-7 rounded-full bg-neutral-300" />
                <div>
                  <div className="text-[11px] font-semibold">Creator name</div>
                  <div className="text-[9px] text-neutral-500">{platform === "linkedin" ? "Staff engineer · 1h" : platform === "x" ? "@creator · 1h" : "12K views · 1 hour ago"}</div>
                </div>
              </div>
              <div className="text-[9px] font-medium text-neutral-500">{disclosure}</div>
              {platform === "youtube" ? (
                <>
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-800">
                    <Photo src={campaign.promoting.image} alt="" sizes="240px" />
                    {b.hooks[0] && <div className="absolute inset-x-2 bottom-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{b.hooks[0]}</div>}
                  </div>
                  <p className="line-clamp-3 text-neutral-600">{b.talkingPoints[0] ?? campaign.promoting.name} {mentions}</p>
                </>
              ) : (
                <>
                  <p className="line-clamp-6 whitespace-pre-line">{body} {mentions}</p>
                  <div className="overflow-hidden rounded-lg border border-neutral-200">
                    <div className="relative aspect-video bg-neutral-200">
                      <Photo src={campaign.promoting.image} alt="" sizes="240px" />
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 text-[10px]">
                      <span className="truncate text-neutral-500">{b.cta.destination || campaign.promoting.url || campaign.businessName}</span>
                      <span className="shrink-0 font-semibold">{CTAS[b.cta.type]}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-muted-foreground">Illustrative. Each creator writes or records their own version in their voice, clearly disclosed.</p>
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
