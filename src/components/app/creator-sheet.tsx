"use client";

import { MapPin, Star, Timer } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { matchCreator } from "@/lib/domain/matching";
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
        </div>

        <div className="space-y-6 px-6 py-6">
          {match && set && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Fit for “{set.name}”</h3>
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
            <p className="mt-1.5 text-xs text-muted-foreground">Last 20 organic videos. Typical range is the middle 50% of results.</p>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              Audience {creator.audience.verified ? <DataTag kind="verified" /> : <span className="text-xs font-normal text-muted-foreground">(self-reported)</span>}
            </h3>
            <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Gender</div>
                <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full">
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
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-chart-1" style={{ width: `${(v / maxAge) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {creator.pastBrands.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Previous brand collaborations</h3>
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
