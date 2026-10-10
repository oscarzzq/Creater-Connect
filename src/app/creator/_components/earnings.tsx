"use client";

import { useState } from "react";
import Link from "next/link";
import { BadgeCheck, CircleAlert, Landmark, MapPin, Plus, UserRoundPen, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PLATFORM_ORDER, PlatformTile, type Platform } from "@/components/platform-icon";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { StackedBar } from "@/components/app/kpi";
import { EmptyState } from "@/components/app/section";
import { DataTag, StatusPill } from "@/components/app/status-badge";
import { BrandMark } from "@/components/creator/brand-mark";
import { useCurrentCreator } from "@/components/creator/creator-context";
import { useCreatorItems, type CreatorItem } from "@/components/creator/creator-data";
import { PayoutGuarantee } from "@/components/creator/post-row";
import { COUNTRY_FLAGS, COUNTRY_NAMES, compact, shortDate, usd } from "@/lib/domain/format";
import { NICHE_LABEL } from "@/lib/domain/labels";
import type { Creator } from "@/lib/domain/types";

export function Earnings() {
  const creator = useCurrentCreator();
  const d = useCreatorItems(creator.id);
  const upcoming = [...d.tabs.active].sort((a, b) => Number(b.phase === "verifying") - Number(a.phase === "verifying"));
  const paid = d.tabs.completed;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <CreatorPhoto creator={creator} size={48} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Earnings &amp; profile</h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <span>{creator.handle}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {creator.city}, {COUNTRY_NAMES[creator.country] ?? creator.country}
            </span>
            <span>{creator.niches.map((n) => NICHE_LABEL[n]).join(" · ")}</span>
          </p>
        </div>
        <Button asChild variant="outline" className="h-9">
          <Link href="/creator/onboarding">
            <UserRoundPen />
            Edit profile
          </Link>
        </Button>
      </header>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-start lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="surface p-4 sm:p-5">
              <div className="text-[13px] font-medium text-muted-foreground">Paid out</div>
              <div className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">{usd(d.totals.paid)}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {paid.length} {paid.length === 1 ? "campaign" : "campaigns"} paid
              </div>
            </div>
            <div className="surface p-4 sm:p-5">
              <div className="text-[13px] font-medium text-muted-foreground">Upcoming payouts</div>
              <div className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">{usd(d.totals.upcoming)}</div>
              <StackedBar
                className="mt-3"
                total={Math.max(1, d.totals.upcoming)}
                segments={[
                  { value: d.totals.verifying, className: "bg-success", label: "Verifying" },
                  { value: d.totals.inProduction, className: "bg-chart-1/40", label: "In production" },
                ]}
              />
              <div className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success" />
                  Verifying {usd(d.totals.verifying)}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span className="size-2 rounded-full bg-chart-1/40" />
                  In production {usd(d.totals.inProduction)}
                </span>
              </div>
            </div>
          </div>

          <section className="surface" aria-labelledby="payouts-h">
            <div className="px-4 pt-4 sm:px-5">
              <h2 id="payouts-h" className="text-sm font-semibold">
                Payouts
              </h2>
              <PayoutGuarantee className="mt-1" />
            </div>
            {upcoming.length + paid.length ? (
              <ul className="mt-3 divide-y border-t">
                {[...upcoming, ...paid].map((item) => (
                  <PayoutRow key={item.activation.id} item={item} />
                ))}
              </ul>
            ) : (
              <EmptyState
                className="m-4 sm:m-5"
                icon={Wallet}
                title="No payouts yet"
                description="Accept an offer and publish your posts. Payouts and their status show up here."
                action={
                  <Button asChild variant="outline">
                    <Link href="/creator">See offers</Link>
                  </Button>
                }
              />
            )}
          </section>

          <Audience creator={creator} />
        </div>

        <aside className="space-y-4">
          <PayoutMethod />
          <Accounts key={`acc-${creator.id}`} creator={creator} />
        </aside>
      </div>
    </div>
  );
}

function PayoutRow({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c, posts } = item;
  const verified = posts.filter((p) => p.status === "verified").length;
  const sub = item.paidAt ? `Paid ${shortDate(item.paidAt)}` : item.phase === "verifying" ? "All posts live · verifying" : `${verified}/${posts.length} posts verified`;
  return (
    <li>
      <Link href={`/creator/offers/${a.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/60 sm:px-5">
        <BrandMark campaign={c} size="md" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{c.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {c.businessName} · {sub}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-base font-semibold tabular-nums">{usd(a.fee)}</span>
          {item.paidAt ? (
            <StatusPill tone="success">Paid</StatusPill>
          ) : item.phase === "verifying" ? (
            <StatusPill tone="brand">Verifying</StatusPill>
          ) : (
            <StatusPill tone="neutral">In production</StatusPill>
          )}
        </div>
      </Link>
    </li>
  );
}

// ---------------------------------------------------------------------------

function PayoutMethod() {
  return (
    <section className="surface p-4" aria-labelledby="payout-method-h">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Landmark className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <h2 id="payout-method-h" className="text-sm font-semibold">
            Payout method
          </h2>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-warning-text">
            <CircleAlert className="size-3.5" />
            Not connected yet
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Payouts go through Stripe. You enter your bank details with Stripe directly; we never see or store them.</p>
      <Button
        className="mt-3 h-10 w-full"
        onClick={() => toast("Stripe payouts", { description: "Demo: this would open Stripe's secure onboarding in a new window." })}
      >
        Connect payouts (Stripe)
      </Button>
    </section>
  );
}

function Accounts({ creator }: { creator: Creator }) {
  const [added, setAdded] = useState<Platform[]>([]);
  const stats = new Map(creator.platforms.map((p) => [p.platform, p]));

  return (
    <section className="surface" aria-labelledby="accounts-h">
      <div className="px-4 pt-4">
        <h2 id="accounts-h" className="text-sm font-semibold">
          Connected accounts
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Read-only. Offers are priced from your median organic views (last 20 videos).</p>
      </div>
      <ul className="mt-3 divide-y border-t">
        {PLATFORM_ORDER.map((p) => {
          const s = stats.get(p);
          const justAdded = added.includes(p);
          return (
            <li key={p} className="flex items-center gap-3 px-4 py-3">
              <PlatformTile platform={p} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {PLATFORMS[p].label}
                  {(s || justAdded) && <BadgeCheck className="size-3.5 text-success" aria-label="Connected" />}
                </div>
                {s ? (
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {compact(s.followers)} followers · {compact(s.medianViews)} median views
                    <div>
                      Typical range {compact(s.p25)}–{compact(s.p75)}
                    </div>
                  </div>
                ) : justAdded ? (
                  <div className="text-xs text-muted-foreground">Connected · importing stats</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Not connected</div>
                )}
              </div>
              {!s && !justAdded && (
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Connect ${PLATFORMS[p].label}`}
                  onClick={() => {
                    setAdded((a) => [...a, p]);
                    toast.success(`${PLATFORMS[p].label} connected`, { description: "Demo: stats appear once your last 20 videos are imported." });
                  }}
                >
                  <Plus />
                  Connect
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------

function Audience({ creator }: { creator: Creator }) {
  const ages = Object.entries(creator.audience.ages);
  const maxAge = Math.max(...ages.map(([, v]) => v));
  const { verified, femalePct, quality, topCountries } = creator.audience;
  return (
    <section className="surface p-4 sm:p-5" aria-labelledby="audience-h">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="audience-h" className="text-sm font-semibold">
          Your audience
        </h2>
        {verified ? <DataTag kind="verified" /> : <StatusPill tone="warning">Not verified</StatusPill>}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Across your connected accounts. This is what brands are matched against.</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-xs text-muted-foreground">Gender</div>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-chart-1" style={{ width: `${femalePct}%` }} />
            <div className="w-0.5 bg-card" />
            <div className="flex-1 bg-chart-2" />
          </div>
          <div className="mt-1.5 flex justify-between text-xs tabular-nums">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-chart-1" />
              Women {femalePct}%
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-chart-2" />
              Men {100 - femalePct}%
            </span>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">Top countries</div>
          <ul className="mt-1.5 space-y-1 text-sm">
            {topCountries.map((c) => (
              <li key={c.code} className="flex items-center justify-between">
                <span>
                  <span aria-hidden>{COUNTRY_FLAGS[c.code]}</span> {COUNTRY_NAMES[c.code] ?? c.code}
                </span>
                <span className="text-muted-foreground tabular-nums">{c.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Age</div>
          <ul className="mt-2 space-y-1.5">
            {ages.map(([bucket, v]) => (
              <li key={bucket} className="flex items-center gap-2 text-xs">
                <span className="w-10 text-muted-foreground tabular-nums">{bucket}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${(v / maxAge) * 100}%` }} />
                </div>
                <span className="w-8 text-right tabular-nums">{v}%</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-muted/60 p-3">
            <div className="text-xs text-muted-foreground">Genuine audience</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">{quality}%</div>
            <p className="text-[11px] text-muted-foreground">{quality >= 80 ? "Meets the 80% minimum brands require." : "Below the 80% minimum most campaigns require."}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
