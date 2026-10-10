"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, relative, usd } from "@/lib/domain/format";
import { STAGES } from "@/lib/domain/labels";
import { campaignRollup, campaignStage, cumulative, dailyResults, dailySpend, dailyViews, dayKeys, sum } from "@/lib/domain/metrics";
import { BUSINESS } from "@/lib/domain/seed";
import type { CampaignStage } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { useInbox } from "@/components/app/business-shell";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { KpiCard } from "@/components/app/kpi";
import { Photo } from "@/components/app/photo";
import { DataTag, StatusPill } from "@/components/app/status-badge";
import { Segmented, TrendChart } from "@/components/app/trend-chart";

type Range = "7" | "30" | "90";
type Metric = "views" | "spend" | "clicks";

const ACTIVE: CampaignStage[] = ["awaiting_approval", "inviting", "in_production", "awaiting_review", "publishing", "live", "make_good"];

export function Overview() {
  const world = useAppState();
  const { needsAction } = useInbox();
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<Metric>("views");
  const [cumulativeView, setCumulativeView] = useState(false);

  const d = useMemo(() => {
    const own = world.campaigns.filter((c) => c.businessId === BUSINESS.id);
    const ids = new Set(own.map((c) => c.id));
    const acts = world.activations.filter((a) => ids.has(a.campaignId));
    const posts = world.posts.filter((p) => ids.has(p.campaignId));
    const stages = own.map((c) => ({ c, stage: campaignStage(c, world.activations, world.posts) }));
    const active = stages.filter((s) => ACTIVE.includes(s.stage) && s.c.status !== "draft");
    const keys = dayKeys(Number(range));
    const views = dailyViews(posts.filter((p) => p.status === "verified"), keys);
    const spend = dailySpend(acts, posts, keys);
    const clicks = own.map((c) => dailyResults("traffic", posts.filter((p) => p.campaignId === c.id), keys)).reduce((acc, s) => acc.map((v, i) => v + s[i]), keys.map(() => 0));
    const rollups = own.map((c) => campaignRollup(c, world));
    return {
      own,
      active,
      keys,
      series: { views, spend, clicks },
      totals: { views: sum(views), spend: sum(spend), clicks: sum(clicks) },
      committed: sum(rollups.map((r) => r.committed)),
      spentAll: sum(rollups.map((r) => r.spent)),
      pendingViews: sum(rollups.map((r) => r.pendingViews)),
      live: active.filter((a) => a.c.guarantee?.minViews).map(({ c }) => ({ c, r: campaignRollup(c, world) })),
    };
  }, [world, range]);

  const values = d.series[metric];
  const shown = cumulativeView ? cumulative(values) : values;
  const fmt = metric === "spend" ? (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}K` : `$${n}`) : compact;
  const byStage = Object.entries(
    d.active.reduce<Record<string, number>>((acc, { stage }) => ({ ...acc, [stage]: (acc[stage] ?? 0) + 1 }), {})
  ) as [CampaignStage, number][];

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {BUSINESS.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {d.active.length} active campaigns · <Link href="/business/inbox" className="font-medium text-foreground hover:underline">{needsAction.length} things need you</Link>
          </p>
        </div>
        <Segmented value={range} onChange={setRange} options={[["7", "Last 7 days"], ["30", "Last 30 days"], ["90", "Last 90 days"]]} />
      </div>

      <div className="grid grid-cols-2 gap-3 @4xl/main:grid-cols-4">
        <KpiCard label="Active campaigns" info="Launched campaigns that aren't completed or cancelled, including make-goods." value={d.active.length}>
          <div className="flex flex-wrap gap-1">
            {byStage.map(([stage, n]) => (
              <StatusPill key={stage} tone={STAGES[stage].tone}>
                {n} {STAGES[stage].label.toLowerCase()}
              </StatusPill>
            ))}
          </div>
        </KpiCard>
        <Link href="/business/inbox" className="group">
          <KpiCard
            className="h-full transition-colors group-hover:border-foreground/15"
            label="Needs attention"
            info="Creator approvals, replacements, content reviews, questions and guarantee alerts. Everything opens in the Inbox."
            value={<span className={cn(needsAction.length && "text-warning-text")}>{needsAction.length}</span>}
            sub={
              <span className="inline-flex items-center gap-1 font-medium text-primary">
                Open inbox <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            }
          />
        </Link>
        <KpiCard
          label="Amount spent"
          info="Creator fees plus the 10% platform fee, charged when a creator's posts are verified. Committed fees aren't spent yet."
          value={usd(d.totals.spend)}
          sub={`${usd(d.committed - d.spentAll)} committed, not yet due`}
        />
        <KpiCard
          label="Organic views delivered"
          info="Views confirmed through platform APIs on published posts, organic only."
          value={compact(d.totals.views)}
          delta={<DataTag kind="verified" />}
          sub={d.pendingViews ? `+${compact(d.pendingViews)} verifying` : "in the selected period"}
        />
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-3">
        <section className="surface @4xl/main:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <Segmented
              value={metric}
              onChange={setMetric}
              options={[["views", `Views · ${compact(d.totals.views)}`], ["spend", `Spend · ${usd(d.totals.spend)}`], ["clicks", `Link clicks · ${compact(d.totals.clicks)}`]]}
            />
            <Segmented value={cumulativeView ? "cum" : "daily"} onChange={(v) => setCumulativeView(v === "cum")} options={[["daily", "Daily"], ["cum", "Cumulative"]]} />
          </div>
          <div className="px-2 pt-4 pb-2">
            <TrendChart keys={d.keys} series={[{ id: metric, label: metric === "views" ? "Verified views" : metric === "spend" ? "Spend" : "Link clicks", values: shown }]} format={fmt} kind={metric === "spend" && !cumulativeView ? "bar" : "area"} height={330} />
          </div>
          <div className="flex items-center gap-2 border-t px-4 py-2.5 text-[11px] text-muted-foreground">
            {metric === "clicks" ? <DataTag kind="attributed" /> : metric === "views" ? <DataTag kind="verified" /> : null}
            {metric === "views" && "Organic views confirmed via platform APIs. Posts still verifying are excluded."}
            {metric === "spend" && "Fees are charged on the day a creator's posts are verified."}
            {metric === "clicks" && "Tracked link clicks attributed to creator posts. Indirect, not verified delivery."}
          </div>
        </section>

        <section className="surface flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h3 className="text-sm font-semibold">Needs attention</h3>
            <Link href="/business/inbox" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <ul className="flex-1 divide-y border-t">
            {needsAction.slice(0, 5).map((i) => {
              const creator = i.creatorId ? creatorById(i.creatorId) : undefined;
              return (
                <li key={i.id}>
                  <Link href={`/business/inbox?item=${i.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40">
                    {creator ? <CreatorPhoto creator={creator} size={28} /> : <span className="size-7 shrink-0 rounded-full bg-warning-subtle" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{i.body}</span>
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relative(i.at)}</span>
                  </Link>
                </li>
              );
            })}
            {needsAction.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
          </ul>
          {d.live.length > 0 && (
            <div className="space-y-2.5 border-t px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                Delivery vs guarantee <DataTag kind="guaranteed" />
              </div>
              {d.live.slice(0, 3).map(({ c, r }) => (
                <Link key={c.id} href={`/business/campaigns/${c.id}`} className="block">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="relative size-4 shrink-0 overflow-hidden rounded">
                        <Photo src={c.promoting.image} alt="" sizes="32px" />
                      </span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {compact(r.views)} / {compact(r.guarantee!)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", (r.delivery ?? 0) >= 1 ? "bg-success" : "bg-primary")} style={{ width: `${Math.min(100, (r.delivery ?? 0) * 100)}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {d.own.length === 0 && (
        <div className="surface flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">Launch your first campaign to see results here.</p>
          <Button asChild>
            <Link href="/business/campaigns/new">
              <Plus />
              Create campaign
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
