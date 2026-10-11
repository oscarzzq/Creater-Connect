"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ChartLine, Columns3, Filter, Pencil, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PLATFORMS, PLATFORM_ORDER, PlatformIcon, PlatformIconRow } from "@/components/platform-icon";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { TODAY, compact, pct, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES, STAGES } from "@/lib/domain/labels";
import { withPlatformFee } from "@/lib/domain/matching";
import {
  campaignRollup, campaignStage, cumulative, dailyResults, dailySpend, dailyViews, dayKeys, setRollup, sum, type Rollup,
} from "@/lib/domain/metrics";
import { BUSINESS } from "@/lib/domain/seed";
import type { Activation, Campaign, CampaignStage, CreatorSet, Objective, Platform, Post } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { useOverlays } from "@/components/app/overlays";
import { Photo } from "@/components/app/photo";
import { EmptyState } from "@/components/app/section";
import { DataTag, PostBadge, StageBadge } from "@/components/app/status-badge";
import { Legend, Segmented, TrendChart, type Series } from "@/components/app/trend-chart";

type Level = "campaigns" | "sets" | "posts";
type Range = "30" | "90" | "180" | "all";

interface Column<R> {
  id: string;
  label: string;
  align?: "right";
  default?: boolean;
  render: (r: R) => React.ReactNode;
  sort?: (r: R) => number | string;
  total?: (rows: R[]) => React.ReactNode;
}

interface CampaignRow { c: Campaign; stage: CampaignStage; r: Rollup; creators: number }
interface SetRow { s: CreatorSet; c: Campaign; stage: CampaignStage; r: Rollup; fit: number; acts: Activation[] }
interface PostRow { p: Post; a: Activation; c: Campaign; s: CreatorSet; fee: number; est: number; views: number | null }

// Column choices per level, remembered per viewer (convenience only).
const DEFAULT_COLUMNS: Record<Level, string[]> = { campaigns: [], sets: [], posts: [] };
let columns: Record<Level, string[]> | null = null;
const columnListeners = new Set<() => void>();
function readColumns() {
  if (!columns) {
    try {
      columns = JSON.parse(localStorage.getItem("cc-columns") ?? "null") ?? DEFAULT_COLUMNS;
    } catch {
      columns = DEFAULT_COLUMNS;
    }
  }
  return columns!;
}
function writeColumns(next: Record<Level, string[]>) {
  columns = next;
  try {
    localStorage.setItem("cc-columns", JSON.stringify(next));
  } catch {
    // ignore
  }
  columnListeners.forEach((l) => l());
}
function subscribeColumns(l: () => void) {
  columnListeners.add(l);
  return () => columnListeners.delete(l);
}

/** Awareness results are views, so cost is shown per 1,000 rather than per single view. */
function costPerResult(objective: Objective, r: Rollup) {
  if (objective === "awareness") return r.ecpm ? <span>{usd(r.ecpm, true)}<span className="text-xs text-muted-foreground"> /1K</span></span> : "—";
  return r.costPerResult ? usd(r.costPerResult, true) : "—";
}

const fmtMoney = (n: number | null) => (n === null ? "—" : usd(n, n < 100));

export function AdsManager() {
  const world = useAppState();
  const { openPost, openActivation } = useOverlays();
  const [level, setLevel] = useState<Level>("campaigns");
  const [range, setRange] = useState<Range>("90");
  const [q, setQ] = useState("");
  const [stages, setStages] = useState<CampaignStage[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [creatorFilter, setCreatorFilter] = useState<string[]>([]);
  const [selCampaigns, setSelCampaigns] = useState<string[]>([]);
  const [selSets, setSelSets] = useState<string[]>([]);
  const [selPosts, setSelPosts] = useState<string[]>([]);
  const [showChart, setShowChart] = useState(true);
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const hidden = useSyncExternalStore(subscribeColumns, readColumns, () => DEFAULT_COLUMNS);
  const toggleColumn = (id: string) => {
    const h = readColumns();
    writeColumns({ ...h, [level]: h[level].includes(id) ? h[level].filter((x) => x !== id) : [...h[level], id] });
  };

  const rangeStart = range === "all" ? "0000" : dayKeys(Number(range))[0];
  const inRange = (start: string, end: string) => range === "all" || (end.slice(0, 10) >= rangeStart && start.slice(0, 10) <= TODAY.toISOString().slice(0, 10));

  const data = useMemo(() => {
    const own = world.campaigns.filter((c) => c.businessId === BUSINESS.id);
    const campaigns: CampaignRow[] = own
      .map((c) => ({
        c,
        stage: campaignStage(c, world.activations, world.posts),
        r: campaignRollup(c, world),
        creators: world.activations.filter((a) => a.campaignId === c.id && a.status === "accepted").length,
      }))
      .filter(({ c, stage }) => {
        if (!inRange(c.startDate, c.endDate) && c.status !== "draft") return false;
        if (stages.length && !stages.includes(stage)) return false;
        if (objectives.length && !objectives.includes(c.objective)) return false;
        if (platforms.length && !world.sets.some((s) => s.campaignId === c.id && s.platforms.some((p) => platforms.includes(p)))) return false;
        if (q && level === "campaigns" && !`${c.name} ${c.promoting.name}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
    const campaignIds = new Set((selCampaigns.length ? selCampaigns : campaigns.map((x) => x.c.id)));
    const sets: SetRow[] = world.sets
      .filter((s) => campaignIds.has(s.campaignId) && campaigns.some((x) => x.c.id === s.campaignId))
      .filter((s) => !platforms.length || s.platforms.some((p) => platforms.includes(p)))
      .filter((s) => !(q && level === "sets") || s.name.toLowerCase().includes(q.toLowerCase()))
      .map((s) => {
        const c = own.find((x) => x.id === s.campaignId)!;
        const acts = world.activations.filter((a) => a.setId === s.id && !["removed"].includes(a.status));
        const live = acts.filter((a) => a.status === "accepted" || a.status === "invited" || a.status === "recommended" || a.status === "approved");
        return { s, c, stage: campaignStage(c, world.activations, world.posts), r: setRollup(s, c, world), fit: live.length ? Math.round(sum(live.map((a) => a.matchScore)) / live.length) : 0, acts };
      });
    const setIds = new Set(selSets.length ? selSets : sets.map((x) => x.s.id));
    const posts: PostRow[] = world.posts
      .filter((p) => setIds.has(p.setId))
      .filter((p) => !platforms.length || platforms.includes(p.platform))
      .filter((p) => !creatorFilter.length || creatorFilter.includes(p.creatorId))
      .filter((p) => !(q && level === "posts") || `${p.caption} ${creatorById(p.creatorId)?.name}`.toLowerCase().includes(q.toLowerCase()))
      .map((p) => {
        const a = world.activations.find((x) => x.id === p.activationId)!;
        const c = own.find((x) => x.id === p.campaignId)!;
        const s = world.sets.find((x) => x.id === p.setId)!;
        const n = world.posts.filter((x) => x.activationId === a.id).length;
        return { p, a, c, s, fee: a.fee / n, est: a.estViews[1] / n, views: p.metrics ? p.metrics.views : null };
      });
    return { own, campaigns, sets, posts };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, stages, objectives, platforms, creatorFilter, selCampaigns, selSets, q, level, range]);

  const creatorsInScope = [...new Set(world.posts.filter((p) => data.sets.some((s) => s.s.id === p.setId)).map((p) => p.creatorId))];

  // ---- Columns
  const campaignCols: Column<CampaignRow>[] = [
    { id: "delivery", label: "Delivery", default: true, render: (x) => <StageBadge stage={x.stage} />, sort: (x) => x.stage },
    { id: "objective", label: "Objective", default: true, render: (x) => OBJECTIVES[x.c.objective].label, sort: (x) => x.c.objective },
    { id: "budget", label: "Budget", align: "right", default: true, render: (x) => usd(x.c.budget), sort: (x) => x.c.budget, total: (rs) => usd(sum(rs.map((x) => x.c.budget))) },
    {
      id: "spent", label: "Spent / committed", align: "right", default: true,
      render: (x) => <span className="tabular-nums">{usd(x.r.spent)} <span className="text-muted-foreground">/ {usd(x.r.committed)}</span></span>,
      sort: (x) => x.r.spent, total: (rs) => `${usd(sum(rs.map((x) => x.r.spent)))} / ${usd(sum(rs.map((x) => x.r.committed)))}`,
    },
    {
      id: "results", label: "Results", align: "right", default: true,
      render: (x) => (x.r.results ? <span>{compact(x.r.results)} <span className="text-xs text-muted-foreground">{OBJECTIVES[x.c.objective].resultPlural.toLowerCase()}</span></span> : "—"),
      sort: (x) => x.r.results,
    },
    { id: "cpr", label: "Cost per result", align: "right", default: true, render: (x) => costPerResult(x.c.objective, x.r), sort: (x) => x.r.costPerResult ?? 0 },
    { id: "views", label: "Organic views", align: "right", default: true, render: (x) => (x.r.views ? compact(x.r.views) : "—"), sort: (x) => x.r.views, total: (rs) => compact(sum(rs.map((x) => x.r.views))) },
    { id: "guaranteed", label: "Guaranteed", align: "right", default: true, render: (x) => (x.r.guarantee ? compact(x.r.guarantee) : "—"), sort: (x) => x.r.guarantee ?? 0, total: (rs) => compact(sum(rs.map((x) => x.r.guarantee ?? 0))) },
    {
      id: "deliveryPct", label: "Delivery %", default: true,
      render: (x) =>
        x.r.delivery === null ? "—" : (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
              <span className={cn("block h-full rounded-full", x.r.delivery >= 1 ? "bg-success" : x.stage === "make_good" ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, x.r.delivery * 100)}%` }} />
            </span>
            <span className="text-xs tabular-nums">{pct(x.r.delivery * 100)}</span>
          </span>
        ),
      sort: (x) => x.r.delivery ?? 0,
    },
    { id: "ecpm", label: "Effective CPM", align: "right", default: true, render: (x) => fmtMoney(x.r.ecpm), sort: (x) => x.r.ecpm ?? 0 },
    { id: "creators", label: "Creators", align: "right", render: (x) => x.creators, sort: (x) => x.creators, total: (rs) => sum(rs.map((x) => x.creators)) },
    { id: "clicks", label: "Link clicks", align: "right", render: (x) => (x.r.clicks ? compact(x.r.clicks) : "—"), sort: (x) => x.r.clicks },
    { id: "dates", label: "Dates", default: true, render: (x) => <span className="text-xs whitespace-nowrap">{shortDate(x.c.startDate)} – {shortDate(x.c.endDate)}</span>, sort: (x) => x.c.startDate },
  ];

  const setCols: Column<SetRow>[] = [
    { id: "delivery", label: "Delivery", default: true, render: (x) => <StageBadge stage={x.stage} />, sort: (x) => x.stage },
    { id: "platforms", label: "Platforms", default: true, render: (x) => <PlatformIconRow platforms={x.s.platforms} />, sort: (x) => x.s.platforms.join() },
    {
      id: "audience", label: "Audience", default: true,
      render: (x) => <span className="text-xs whitespace-nowrap">{x.s.demographics.gender === "all" ? "All" : x.s.demographics.gender === "women" ? "Women" : "Men"} {x.s.demographics.ageMin}–{x.s.demographics.ageMax} · {x.s.audienceGeo.join(", ")}</span>,
    },
    {
      id: "creators", label: "Creators", align: "right", default: true,
      render: (x) => <span className="tabular-nums">{x.r.creators.accepted}<span className="text-muted-foreground"> accepted · {x.r.creators.invited} invited</span></span>,
      sort: (x) => x.r.creators.accepted,
    },
    { id: "spent", label: "Spent / committed", align: "right", default: true, render: (x) => <span className="tabular-nums">{usd(x.r.spent)} <span className="text-muted-foreground">/ {usd(x.r.committed)}</span></span>, sort: (x) => x.r.spent },
    { id: "results", label: "Results", align: "right", default: true, render: (x) => (x.r.results ? compact(x.r.results) : "—"), sort: (x) => x.r.results },
    { id: "cpr", label: "Cost per result", align: "right", default: true, render: (x) => costPerResult(x.c.objective, x.r), sort: (x) => x.r.costPerResult ?? 0 },
    { id: "views", label: "Organic views", align: "right", default: true, render: (x) => (x.r.views ? compact(x.r.views) : "—"), sort: (x) => x.r.views, total: (rs) => compact(sum(rs.map((x) => x.r.views))) },
    { id: "est", label: "Est. views", align: "right", default: true, render: (x) => <span className="text-muted-foreground">{compact(x.r.estViews[1])}</span>, sort: (x) => x.r.estViews[1] },
    { id: "ecpm", label: "Effective CPM", align: "right", default: true, render: (x) => fmtMoney(x.r.ecpm), sort: (x) => x.r.ecpm ?? 0 },
    { id: "fit", label: "Audience fit", align: "right", render: (x) => x.fit || "—", sort: (x) => x.fit },
  ];

  const postCols: Column<PostRow>[] = [
    { id: "creator", label: "Creator", default: true, render: (x) => <span className="flex items-center gap-2 whitespace-nowrap"><CreatorPhoto creator={creatorById(x.p.creatorId)!} size={20} />{creatorById(x.p.creatorId)?.name}</span>, sort: (x) => creatorById(x.p.creatorId)?.name ?? "" },
    { id: "set", label: "Campaign · set", default: true, render: (x) => <span className="block max-w-48 truncate text-xs">{x.c.name} · {x.s.name}</span>, sort: (x) => x.c.name },
    { id: "status", label: "Content status", default: true, render: (x) => <PostBadge status={x.p.status} />, sort: (x) => x.p.status },
    { id: "published", label: "Published", default: true, render: (x) => <span className="text-xs">{x.p.publishedAt ? shortDate(x.p.publishedAt) : `Due ${shortDate(x.p.dueAt)}`}</span>, sort: (x) => x.p.publishedAt ?? x.p.dueAt },
    { id: "fee", label: "Fixed fee", align: "right", default: true, render: (x) => usd(x.fee), sort: (x) => x.fee, total: (rs) => usd(sum(rs.map((x) => x.fee))) },
    { id: "est", label: "Est. views", align: "right", default: true, render: (x) => <span className="text-muted-foreground">{compact(x.est)}</span>, sort: (x) => x.est },
    {
      id: "views", label: "Actual views", align: "right", default: true,
      render: (x) => (x.views === null ? "—" : <span className={cn(x.p.status === "published" && "text-muted-foreground")}>{compact(x.views)}{x.p.status === "published" && "*"}</span>),
      sort: (x) => x.views ?? -1, total: (rs) => compact(sum(rs.map((x) => (x.p.status === "verified" ? x.views ?? 0 : 0)))),
    },
    {
      id: "vsEst", label: "vs estimate", align: "right", default: true,
      render: (x) => (x.views === null || x.p.status !== "verified" ? "—" : <span className={cn("tabular-nums", x.views >= x.est ? "text-success-text" : "text-warning-text")}>{pct((x.views / x.est) * 100)}</span>),
      sort: (x) => (x.views ?? 0) / x.est,
    },
    { id: "ecpm", label: "Effective CPM", align: "right", default: true, render: (x) => (x.p.status === "verified" && x.views ? usd((withPlatformFee(x.fee) / x.views) * 1000, true) : "—"), sort: (x) => (x.views ? x.fee / x.views : 0) },
    { id: "clicks", label: "Link clicks", align: "right", render: (x) => (x.p.metrics?.clicks ? compact(x.p.metrics.clicks) : "—"), sort: (x) => x.p.metrics?.clicks ?? 0 },
    { id: "fit", label: "Audience fit", align: "right", render: (x) => x.a.matchScore, sort: (x) => x.a.matchScore },
  ];

  // ---- Chart
  const [chartMetric, setChartMetric] = useState<"views" | "cumulative" | "spend" | "cpm" | "results" | "guarantee">("views");
  const keys = dayKeys(range === "all" ? 120 : Number(range));
  const chart = useMemo(() => {
    const groups: { id: string; label: string; posts: Post[]; acts: Activation[]; objective: Objective; guarantee?: number }[] =
      level === "campaigns"
        ? (selCampaigns.length ? data.campaigns.filter((x) => selCampaigns.includes(x.c.id)) : []).slice(0, 4).map((x) => ({
            id: x.c.id, label: x.c.name, posts: world.posts.filter((p) => p.campaignId === x.c.id), acts: world.activations.filter((a) => a.campaignId === x.c.id), objective: x.c.objective, guarantee: x.c.guarantee?.minViews,
          }))
        : level === "sets"
          ? (selSets.length ? data.sets.filter((x) => selSets.includes(x.s.id)) : []).slice(0, 4).map((x) => ({
              id: x.s.id, label: x.s.name, posts: world.posts.filter((p) => p.setId === x.s.id), acts: world.activations.filter((a) => a.setId === x.s.id), objective: x.c.objective,
            }))
          : (selPosts.length ? data.posts.filter((x) => selPosts.includes(x.p.id)) : []).slice(0, 4).map((x) => ({
              id: x.p.id, label: `${creatorById(x.p.creatorId)?.name} · ${x.p.caption.slice(0, 18) || "post"}`, posts: [x.p], acts: [], objective: x.c.objective,
            }));
    const all = {
      id: "all", label: "All in view",
      posts: level === "posts" ? data.posts.map((x) => x.p) : level === "sets" ? world.posts.filter((p) => data.sets.some((s) => s.s.id === p.setId)) : world.posts.filter((p) => data.campaigns.some((c) => c.c.id === p.campaignId)),
      acts: level === "posts" ? [] : world.activations.filter((a) => (level === "sets" ? data.sets.some((s) => s.s.id === a.setId) : data.campaigns.some((c) => c.c.id === a.campaignId))),
      objective: "awareness" as Objective,
      guarantee: level === "campaigns" ? sum(data.campaigns.map((c) => c.r.guarantee ?? 0)) : undefined,
    };
    const use = groups.length ? groups : [all];
    const series: Series[] = use.map((g) => {
      const verified = g.posts.filter((p) => p.status === "verified");
      const views = dailyViews(verified, keys);
      const spend = dailySpend(g.acts, world.posts, keys);
      const values =
        chartMetric === "views" ? views
        : chartMetric === "cumulative" || chartMetric === "guarantee" ? cumulative(views)
        : chartMetric === "spend" ? spend
        : chartMetric === "cpm" ? (() => { const v = cumulative(views); const s = cumulative(spend); return v.map((x, i) => (x ? Math.round((s[i] / x) * 1000 * 100) / 100 : 0)); })()
        : dailyResults(g.objective === "awareness" ? "traffic" : g.objective, g.posts, keys);
      return { id: g.id, label: g.label, values };
    });
    if (chartMetric === "guarantee") {
      const g = use.length === 1 ? use[0].guarantee : undefined;
      if (g) series.push({ id: "g", label: `Guaranteed (${compact(g)})`, values: keys.map(() => g), dashed: true });
    }
    return { series, comparing: groups.length > 0 };
  }, [chartMetric, data, keys, level, selCampaigns, selPosts, selSets, world]);

  const chartFormat = chartMetric === "spend" ? (n: number) => `$${compact(n)}` : chartMetric === "cpm" ? (n: number) => `$${n.toFixed(0)}` : compact;

  // Meta-style: select exactly one row, then Edit opens the editor on that node.
  const editHref =
    level === "campaigns" && selCampaigns.length === 1 ? `/business/campaigns/${selCampaigns[0]}/edit`
    : level === "sets" && selSets.length === 1 ? `/business/campaigns/${data.sets.find((x) => x.s.id === selSets[0])?.c.id}/edit?node=set:${selSets[0]}`
    : level === "posts" && selPosts.length === 1 ? (() => { const p = data.posts.find((x) => x.p.id === selPosts[0]); return p ? `/business/campaigns/${p.c.id}/edit?node=creator:${p.a.id}` : null; })()
    : null;
  const cols = level === "campaigns" ? campaignCols : level === "sets" ? setCols : postCols;
  const activeFilters = stages.length + objectives.length + platforms.length + creatorFilter.length;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every campaign, creator set and post, on one shared data model.</p>
        </div>
        <Button asChild className="h-9">
          <Link href="/business/campaigns/new">
            <Plus />
            Create campaign
          </Link>
        </Button>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border bg-card shadow-card">
        {(
          [
            ["campaigns", "Campaigns", data.campaigns.length, selCampaigns.length, () => setSelCampaigns([])],
            ["sets", "Creator sets", data.sets.length, selSets.length, () => setSelSets([])],
            ["posts", "Ads", data.posts.length, selPosts.length, () => setSelPosts([])],
          ] as const
        ).map(([key, label, count, sel, clear]) => (
          <button key={key} onClick={() => { setLevel(key); setSort(null); }} className={cn("relative flex items-center gap-2 border-r px-4 py-3 text-left text-sm font-medium last:border-r-0 hover:bg-muted/40", level === key && "bg-brand-subtle/40")}>
            {level === key && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            {label}
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
            {sel > 0 && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-primary px-1.5 py-0.5 text-[11px] text-primary-foreground">
                {sel} selected
                <X className="size-3" onClick={(e) => { e.stopPropagation(); clear(); }} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${level === "sets" ? "creator sets" : level === "posts" ? "ads" : "campaigns"}`} className="h-8 w-full rounded-lg border bg-card pr-3 pl-8 text-sm shadow-card outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" />
        </div>
        <FilterMenu label="Status" icon options={(Object.keys(STAGES) as CampaignStage[]).map((s) => [s, STAGES[s].label])} value={stages} onChange={setStages} />
        <FilterMenu label="Objective" options={(Object.keys(OBJECTIVES) as Objective[]).map((o) => [o, OBJECTIVES[o].label])} value={objectives} onChange={setObjectives} />
        <FilterMenu label="Platform" options={PLATFORM_ORDER.map((p) => [p, PLATFORMS[p].label])} value={platforms} onChange={setPlatforms} />
        {level === "posts" && <FilterMenu label="Creator" options={creatorsInScope.map((id) => [id, creatorById(id)?.name ?? id])} value={creatorFilter} onChange={setCreatorFilter} />}
        {activeFilters > 0 && (
          <Button variant="ghost" size="sm" onClick={() => { setStages([]); setObjectives([]); setPlatforms([]); setCreatorFilter([]); }}>
            Clear filters
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 bg-card shadow-card" disabled={!editHref} asChild={!!editHref} title={editHref ? undefined : "Select one row to edit"}>
            {editHref ? <Link href={editHref}><Pencil />Edit</Link> : <span><Pencil />Edit</span>}
          </Button>
          <Segmented value={range} onChange={setRange} options={[["30", "30D"], ["90", "90D"], ["180", "180D"], ["all", "All"]]} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 bg-card shadow-card">
                <Columns3 />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1">
              <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground uppercase">Show columns</div>
              {cols.map((c) => {
                const on = (c.default && !hidden[level].includes(c.id)) || hidden[level].includes(`+${c.id}`);
                return (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" className="size-4 accent-(--primary)" checked={on} onChange={() => toggleColumn(c.default ? c.id : `+${c.id}`)} />
                    {c.label}
                  </label>
                );
              })}
            </PopoverContent>
          </Popover>
          <Button variant={showChart ? "secondary" : "outline"} size="sm" className="h-8 shadow-card" onClick={() => setShowChart((s) => !s)}>
            <ChartLine />
            Charts
          </Button>
        </div>
      </div>

      {showChart && (
        <section className="surface">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
            <Segmented
              value={chartMetric}
              onChange={setChartMetric}
              options={[["views", "Daily views"], ["cumulative", "Cumulative views"], ["spend", "Spend"], ["cpm", "Cost per 1K views"], ["guarantee", "Guaranteed vs delivered"], ["results", "Tracked results"]]}
            />
            <span className="text-xs text-muted-foreground">{chart.comparing ? `Comparing ${chart.series.filter((s) => !s.dashed).length} selected` : "Select rows to compare"}</span>
          </div>
          <div className="px-2 pt-3">
            <TrendChart keys={keys} series={chart.series} format={chartFormat} kind={chartMetric === "spend" && !chart.comparing ? "bar" : "area"} height={220} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
            <Legend series={chart.series} />
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              {chartMetric === "results" ? <><DataTag kind="attributed" /> Clicks or conversions per objective</> : <><DataTag kind="verified" /> Verified organic views only</>}
              {chartMetric === "guarantee" && !chart.series.some((s) => s.dashed) && " · select one campaign to see its guarantee line"}
            </span>
          </div>
          {chart.comparing && (
            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
              Comparisons show observed differences between creator strategies, not controlled experiments.
            </p>
          )}
        </section>
      )}

      {level === "campaigns" &&
        (data.campaigns.length ? (
          <DataTable<CampaignRow>
            hiddenIds={hidden[level]}
            sort={sort}
            setSort={setSort}
            noun="campaigns"
            rows={data.campaigns}
            cols={campaignCols}
            rowKey={(x) => x.c.id}
            selected={selCampaigns}
            setSelected={setSelCampaigns}
            name={(x) => (
              <span className="flex items-center gap-2.5">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-border">
                  <Photo src={x.c.promoting.image} alt="" sizes="64px" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Link href={`/business/campaigns/${x.c.id}`} className="block truncate font-medium hover:underline">
                      {x.c.name}
                    </Link>
                    <Link href={`/business/campaigns/${x.c.id}/edit`} className="hidden text-xs font-medium text-primary group-hover/row:inline hover:underline">Edit</Link>
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <PlatformIconRow platforms={[...new Set(world.sets.filter((s) => s.campaignId === x.c.id).flatMap((s) => s.platforms))]} />
                    <button className="hover:text-foreground hover:underline" onClick={() => { setSelCampaigns([x.c.id]); setLevel("sets"); }}>
                      {world.sets.filter((s) => s.campaignId === x.c.id).length} creator sets
                    </button>
                  </span>
                </span>
              </span>
            )}
          />
        ) : (
          <EmptyState icon={Filter} title="No campaigns match" description="Clear filters or widen the date range." />
        ))}

      {level === "sets" &&
        (data.sets.length ? (
          <DataTable<SetRow>
            hiddenIds={hidden[level]}
            sort={sort}
            setSort={setSort}
            noun="creator sets"
            rows={data.sets}
            cols={setCols}
            rowKey={(x) => x.s.id}
            selected={selSets}
            setSelected={setSelSets}
            name={(x) => (
              <span className="block min-w-0">
                <Link href={`/business/campaigns/${x.c.id}?tab=sets&set=${x.s.id}`} className="block truncate font-medium hover:underline">
                  {x.s.name}
                </Link>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {x.c.name} ·
                  <button className="hover:text-foreground hover:underline" onClick={() => { setSelSets([x.s.id]); setLevel("posts"); }}>
                    {world.posts.filter((p) => p.setId === x.s.id).length} posts
                  </button>
                </span>
              </span>
            )}
          />
        ) : (
          <EmptyState icon={Filter} title="No creator sets" description="Select campaigns with creator sets, or clear filters." />
        ))}

      {level === "posts" &&
        (data.posts.length ? (
          <>
            <DataTable<PostRow>
            hiddenIds={hidden[level]}
            sort={sort}
            setSort={setSort}
            noun="ads"
              rows={data.posts}
              cols={postCols}
              rowKey={(x) => x.p.id}
              selected={selPosts}
              setSelected={setSelPosts}
              name={(x) => (
                <button className="flex items-center gap-2.5 text-left" onClick={() => openPost(x.p.id)}>
                  <span className="relative h-11 w-[25px] shrink-0 overflow-hidden rounded bg-muted">
                    <Photo src={x.p.thumbnail} alt="" sizes="50px" />
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-56 truncate font-medium hover:underline">{x.p.caption || `Post ${x.p.index}`}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <PlatformIcon platform={x.p.platform} className="size-3" />
                      {PLATFORMS[x.p.platform].format}
                      {world.posts.filter((p) => p.activationId === x.a.id).length > 1 && ` ${x.p.index}`} ·
                      <span role="link" tabIndex={0} className="hover:text-foreground hover:underline" onClick={(e) => { e.stopPropagation(); openActivation(x.a.id); }}>
                        activation
                      </span>
                    </span>
                  </span>
                </button>
              )}
            />
            <p className="text-xs text-muted-foreground">* Published, still verifying. Excluded from totals until verified (up to 48h).</p>
          </>
        ) : (
          <EmptyState icon={Filter} title="No ads yet" description="Posts appear as soon as creators accept. Select a different creator set or clear filters." />
        ))}
    </div>
  );
}

function DataTable<R>({ rows, cols, rowKey, name, selected, setSelected, hiddenIds, sort, setSort, noun }: {
rows: R[]; cols: Column<R>[]; rowKey: (r: R) => string; name: (r: R) => React.ReactNode; selected: string[]; setSelected: (s: string[]) => void;
hiddenIds: string[]; sort: { id: string; dir: 1 | -1 } | null; setSort: React.Dispatch<React.SetStateAction<{ id: string; dir: 1 | -1 } | null>>; noun: string;
}) {
  const visible = cols.filter((c) => !hiddenIds.includes(c.id) && (c.default || hiddenIds.includes(`+${c.id}`)));
  const sorted = sort ? [...rows].sort((a, b) => {
    const col = cols.find((c) => c.id === sort.id);
    const va = col?.sort?.(a) ?? 0, vb = col?.sort?.(b) ?? 0;
    return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
  }) : rows;
  const allSel = rows.length > 0 && rows.every((r) => selected.includes(rowKey(r)));
  return (
    <div className="surface overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <input type="checkbox" aria-label="Select all" className="size-4 accent-(--primary)" checked={allSel} onChange={() => setSelected(allSel ? [] : rows.map(rowKey))} />
            </th>
            <th className="px-3 py-2.5 text-left font-medium">Name</th>
            {visible.map((c) => (
              <th key={c.id} className={cn("px-3 py-2.5 font-medium whitespace-nowrap", c.align === "right" ? "text-right" : "text-left")}>
                <button
                  className="inline-flex items-center gap-1 hover:text-foreground"
                  onClick={() => setSort((s) => (s?.id === c.id ? (s.dir === -1 ? { id: c.id, dir: 1 } : null) : { id: c.id, dir: -1 }))}
                >
                  {c.label}
                  {sort?.id === c.id && (sort.dir === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => {
            const k = rowKey(r);
            const on = selected.includes(k);
            return (
              <tr key={k} className={cn("group/row transition-colors hover:bg-muted/30", on && "bg-brand-subtle/40")}>
                <td className="px-3 py-2.5">
                  <input type="checkbox" aria-label="Select row" className="size-4 accent-(--primary)" checked={on} onChange={() => setSelected(on ? selected.filter((x) => x !== k) : [...selected, k])} />
                </td>
                <td className="px-3 py-2.5">{name(r)}</td>
                {visible.map((c) => (
                  <td key={c.id} className={cn("px-3 py-2.5 tabular-nums", c.align === "right" && "text-right")}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t bg-muted/30 text-xs">
          <tr>
            <td />
            <td className="px-3 py-2.5 font-medium">
              {rows.length} {noun}
            </td>
            {visible.map((c) => (
              <td key={c.id} className={cn("px-3 py-2.5 font-medium tabular-nums", c.align === "right" && "text-right")}>
                {c.total?.(rows)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function FilterMenu<T extends string>({ label, options, value, onChange, icon }: { label: string; options: [T, string][]; value: T[]; onChange: (v: T[]) => void; icon?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-8 bg-card shadow-card", value.length && "border-primary/40 text-primary")}>
          {icon && <Filter />}
          {label}
          {value.length > 0 && <span className="rounded bg-primary/10 px-1 text-[11px] tabular-nums">{value.length}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-60 overflow-y-auto p-1">
        {options.map(([v, l]) => (
          <label key={v} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
            <input type="checkbox" className="size-4 accent-(--primary)" checked={value.includes(v)} onChange={() => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])} />
            {l}
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}
