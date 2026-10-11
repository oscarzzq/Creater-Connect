"use client";

import { CalendarCheck, MapPin, RefreshCw, Star, Timer } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { matchCreator } from "@/lib/domain/matching";
import { ANALYTICS_SOURCE, creatorAnalytics, targetAudienceShare } from "@/lib/domain/analytics";
import { COUNTRY_FLAGS, COUNTRY_NAMES, compact, usd } from "@/lib/domain/format";
import { NICHE_LABEL } from "@/lib/domain/labels";
import { BUSINESS } from "@/lib/domain/seed";
import { Photo } from "./photo";
import { CreatorPhoto } from "./creator-photo";
import { MatchBreakdown } from "./match-breakdown";
import { ActivationBadge, DataTag } from "./status-badge";

/** Creator profile, optionally scored against a creator set. */
export function CreatorSheet({
  creatorId,
  setId,
  open,
  onOpenChange,
  onOpenActivation,
  setOverride,
  campaignOverride,
}: {
  creatorId: string | null;
  setId?: string;
  /** Unsaved set/campaign (e.g. from the builder) to score against. */
  setOverride?: import("@/lib/domain/types").CreatorSet;
  campaignOverride?: import("@/lib/domain/types").Campaign;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenActivation: (id: string) => void;
}) {
  const { campaigns, sets, activations } = useAppState();
  const creator = creatorId ? creatorById(creatorId) : undefined;
  if (!creator) return null;
  const set = setOverride ?? sets.find((s) => s.id === setId);
  const campaign = campaignOverride ?? (set && campaigns.find((c) => c.id === set.campaignId));
  const match = set && campaign ? matchCreator(creator, set, campaign) : null;
  const history = activations
    .filter((a) => a.creatorId === creator.id && !["recommended", "removed"].includes(a.status))
    .map((a) => ({ a, c: campaigns.find((c) => c.id === a.campaignId) }))
    .filter((h) => h.c?.businessId === BUSINESS.id);
  const ages = Object.entries(creator.audience.ages);
  const an = creatorAnalytics(creator);
  const target = set ? targetAudienceShare(creator, set) : null;
  const sources = creator.platforms.map((p) => ANALYTICS_SOURCE[p.platform]).join(", ");
  const maxView = Math.max(...an.recent.views);
  const maxHour = Math.max(...an.activeHours);
  const maxAge = Math.max(...ages.map(([, v]) => v));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-[540px]">
        <div className="grid h-44 grid-cols-3 gap-0.5 bg-muted">
          {creator.samples.map((s) => (
            <div key={s} className="relative">
              <Photo src={s} alt="" sizes="180px" />
            </div>
          ))}
        </div>
        <div className="px-6">
          <div className="-mt-9 flex items-end justify-between gap-3">
            <CreatorPhoto creator={creator} size={72} className="ring-4 ring-popover" />
            <div className="mb-1 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-warning text-warning" />
                <span className="font-medium text-foreground">{creator.rating}</span> · {creator.completedCampaigns} campaigns
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3.5" />
                Replies {creator.responseTime}
              </span>
            </div>
          </div>
          <SheetTitle className="mt-3 text-lg font-semibold tracking-tight">{creator.name}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{creator.handle}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {creator.city}, {COUNTRY_NAMES[creator.country]} · {creator.languages.join(", ")}
            </span>
          </SheetDescription>
          <p className="mt-3 text-sm">{creator.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {creator.niches.map((n, i) => (
              <span key={n} className={i === 0 ? "rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background" : "rounded-md bg-muted px-2 py-0.5 text-xs"}>
                {NICHE_LABEL[n]}
              </span>
            ))}
            {creator.interests.map((s) => (
              <span key={s} className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-success-subtle/60 px-2 py-1 text-[11px] text-success-text">
            <RefreshCw className="size-3" />
            Connected accounts · data from {sources} · synced {an.syncedHoursAgo}h ago
          </p>
        </div>

        <div className="space-y-6 px-6 py-6">
          {match && set && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Fit for “{set.name}”</h3>
              {target && (
                <div className="mb-3 flex items-center gap-4 rounded-xl border p-3.5">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight tabular-nums">{target.pct}%</div>
                    <div className="text-[11px] text-muted-foreground">of audience in your target</div>
                  </div>
                  <div className="flex-1 space-y-1 text-xs">
                    {(
                      [
                        [set.demographics.gender === "all" ? "Any gender" : set.demographics.gender === "women" ? "Women" : "Men", target.genderShare],
                        [`Aged ${set.demographics.ageMin}–${set.demographics.ageMax}`, target.ageShare],
                        [set.audienceGeo.length ? `In ${set.audienceGeo.join(", ")}` : "Any country", target.geoShare],
                      ] as const
                    ).map(([label, v]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="w-24 truncate text-muted-foreground">{label}</span>
                        <div className="h-1.5 flex-1 bg-muted"><div className="h-full bg-chart-1" style={{ width: `${v}%` }} /></div>
                        <span className="w-8 text-right tabular-nums">{v}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <MatchBreakdown match={match} />
              {match.quote && (
                <dl className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border text-sm">
                  <div className="bg-card p-3">
                    <dt className="text-xs text-muted-foreground">Fixed fee</dt>
                    <dd className="font-semibold tabular-nums">{usd(match.quote.fee)}</dd>
                  </div>
                  <div className="bg-card p-3">
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      Est. views <DataTag kind="estimate" />
                    </dt>
                    <dd className="font-semibold tabular-nums">
                      {compact(match.quote.estViews[0])}–{compact(match.quote.estViews[2])}
                    </dd>
                  </div>
                  <div className="bg-card p-3">
                    <dt className="text-xs text-muted-foreground">Effective CPM</dt>
                    <dd className="font-semibold tabular-nums">{usd(match.quote.ecpm, true)}</dd>
                  </div>
                </dl>
              )}
            </section>
          )}

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Content performance <DataTag kind="verified" />
            </h3>
            <div className="rounded-xl border p-4">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <PlatformIcon platform={an.recent.platform} className="size-3.5" />
                  {PLATFORMS[an.recent.platform].unit[0].toUpperCase() + PLATFORMS[an.recent.platform].unit.slice(1)} on last 20 posts
                </span>
                <span>median {compact(an.recent.median)}</span>
              </div>
              <div className="relative mt-3 flex h-20 items-end gap-[3px]" role="img" aria-label={`${PLATFORMS[an.recent.platform].unit} on last 20 posts, median ${compact(an.recent.median)}`}>
                <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-foreground/30" style={{ bottom: `${(an.recent.median / maxView) * 100}%` }} />
                {an.recent.views.map((v, i) => (
                  <div key={i} title={`${compact(v)} ${PLATFORMS[an.recent.platform].unit}`} className="flex-1 rounded-t-[2px] bg-chart-1/80 hover:bg-chart-1" style={{ height: `${Math.max(4, (v / maxView) * 100)}%` }} />
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {(
                  [
                    ...an.contentStats.map((s) => [s.label, s.value] as const),
                    ["Audience growth, 30d", `+${an.followerGrowth30d}%`],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[11px] text-muted-foreground">{label}</dt>
                    <dd className="font-semibold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Recent organic performance</h3>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Platform</th>
                    <th className="px-3 py-2 text-right font-medium">Median views</th>
                    <th className="px-3 py-2 text-right font-medium">Typical range</th>
                    <th className="px-3 py-2 text-right font-medium">Followers</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {creator.platforms.map((p) => (
                    <tr key={p.platform}>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-2">
                          <PlatformIcon platform={p.platform} />
                          {PLATFORMS[p.platform].label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{compact(p.medianViews)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {compact(p.p25)}–{compact(p.p75)}
                      </td>
                      <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">{compact(p.followers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">Last 20 organic posts. LinkedIn counts impressions and newsletters count opens. Typical range is the middle 50% of results.</p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Audience {creator.audience.verified ? <DataTag kind="verified" /> : <span className="text-xs font-normal text-muted-foreground">(self-reported)</span>}
            </h3>
            <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Gender</div>
                <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-none">
                  <div className="bg-chart-1" style={{ width: `${creator.audience.femalePct}%` }} />
                  <div className="flex-1 bg-chart-2" />
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-1" />
                    Women {creator.audience.femalePct}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-2" />
                    Men {100 - creator.audience.femalePct}%
                  </span>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Top countries</div>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {creator.audience.topCountries.map((c) => (
                    <li key={c.code} className="flex items-center justify-between">
                      <span>
                        {COUNTRY_FLAGS[c.code]} {COUNTRY_NAMES[c.code] ?? c.code}
                      </span>
                      <span className="text-muted-foreground tabular-nums">{c.pct}%</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 text-xs text-muted-foreground">Genuine audience</div>
                <div className="text-sm font-medium tabular-nums">{creator.audience.quality}%</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Age</div>
                <div className="mt-2 space-y-1.5">
                  {ages.map(([bucket, v]) => (
                    <div key={bucket} className="flex items-center gap-2 text-xs">
                      <span className="w-10 text-muted-foreground tabular-nums">{bucket}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-none bg-muted">
                        <div className="h-full rounded-none bg-chart-1" style={{ width: `${(v / maxAge) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{v}%</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Top cities</div>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {an.topCities.map((c) => (
                    <li key={c.name} className="flex items-center justify-between">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground tabular-nums">{c.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-3 grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <div>
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>When their audience is active</span>
                  <span className="font-medium text-foreground">{an.peakWindow}</span>
                </div>
                <div className="mt-2 flex h-12 items-end gap-px" role="img" aria-label={`Audience most active ${an.peakWindow}`}>
                  {an.activeHours.map((v, h) => (
                    <div key={h} title={`${h}:00 · ${v}%`} className="flex-1 bg-chart-2/80" style={{ height: `${(v / maxHour) * 100}%` }} />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>12am</span><span>6am</span><span>12pm</span><span>6pm</span><span>11pm</span>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Viewers</div>
                <div className="mt-2 flex h-2 gap-0.5 overflow-hidden">
                  <div className="bg-chart-1" style={{ width: `${100 - an.returningPct}%` }} />
                  <div className="flex-1 bg-chart-2" />
                </div>
                <div className="mt-1.5 flex justify-between text-xs">
                  <span>New {100 - an.returningPct}%</span>
                  <span>Returning {an.returningPct}%</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">How viewers find them</div>
                <ul className="mt-1.5 space-y-1.5">
                  {an.traffic.map((t) => (
                    <li key={t.label} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate">{t.label}</span>
                      <div className="h-1.5 flex-1 bg-muted"><div className="h-full bg-chart-1" style={{ width: `${t.pct}%` }} /></div>
                      <span className="w-8 text-right tabular-nums">{t.pct}%</span>
                    </li>
                  ))}
                </ul>
                {an.interests.length > 0 && (
                  <>
                    <div className="mt-4 text-xs text-muted-foreground">Audience interests</div>
                    <ul className="mt-1.5 space-y-1 text-sm">
                      {an.interests.map((i) => (
                        <li key={i.label} className="flex items-center justify-between">
                          <span className="truncate">{i.label}</span>
                          <span className="text-muted-foreground tabular-nums">{i.pct}%</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarCheck className="size-4 text-muted-foreground" />
              Reliability on Klynt
            </h3>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border text-sm sm:grid-cols-4">
              {(
                [
                  ["Posted on time", `${an.reliability.onTimePct}%`],
                  ["Sponsored vs. usual views", an.reliability.sponsoredVsOrganicPct ? `${an.reliability.sponsoredVsOrganicPct}%` : "New"],
                  ["Avg. revisions", `${an.reliability.avgRevisions}`],
                  ["Campaigns done", `${an.reliability.campaigns}`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="bg-card p-3">
                  <dt className="text-[11px] text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {an.reliability.sponsoredVsOrganicPct ? `Their sponsored posts typically reach ${an.reliability.sponsoredVsOrganicPct}% of their usual organic views. ` : ""}Reliable creators get offers first.
            </p>
          </section>

          {creator.pastBrands.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Previous sponsorships</h3>
              <div className="flex flex-wrap gap-1.5">
                {creator.pastBrands.map((b) => (
                  <span key={b} className="rounded-md border px-2 py-0.5 text-xs">
                    {b}
                  </span>
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">With {BUSINESS.name}</h3>
              <ul className="divide-y rounded-xl border">
                {history.map(({ a, c }) => (
                  <li key={a.id}>
                    <button className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/40" onClick={() => onOpenActivation(a.id)}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{c?.name}</span>
                        <span className="text-xs text-muted-foreground">{usd(a.fee)} fixed fee</span>
                      </span>
                      <ActivationBadge status={a.status} supplementary={a.supplementary} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
