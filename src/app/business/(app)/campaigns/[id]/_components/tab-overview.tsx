"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { TODAY, compact, daysBetween, pct, relative, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES, REMEDIES } from "@/lib/domain/labels";
import { PLATFORM_FEE_RATE } from "@/lib/domain/matching";
import { cumulative, dailyViews, dayKeys, inboxItems, payment, projectedViews, setRollup, sum } from "@/lib/domain/metrics";
import { BUSINESS } from "@/lib/domain/seed";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { useOverlays } from "@/components/app/overlays";
import { PlatformIconRow, PLATFORMS } from "@/components/platform-icon";
import { DataTag, PostBadge } from "@/components/app/status-badge";
import { Legend, TrendChart } from "@/components/app/trend-chart";
import type { DetailProps } from "./types";

export function OverviewTab({ campaign, sets, activations, posts, rollup: r, goTo }: DetailProps) {
  const world = useAppState();
  const { openPost } = useOverlays();
  const accepted = activations.filter((a) => a.status === "accepted");

  const pipeline = [
    { label: "Invited", value: r.creators.invited, unit: "creators", owner: "Creators" },
    { label: "Accepted", value: r.creators.accepted, unit: "creators", owner: "Creators" },
    { label: "In production", value: r.posts.not_started + r.posts.revision_requested, unit: "posts", owner: "Creators" },
    { label: "Awaiting review", value: r.posts.draft_submitted, unit: "posts", owner: "You", highlight: r.posts.draft_submitted > 0 },
    { label: "Ready to publish", value: r.posts.approved, unit: "posts", owner: "Creators" },
    { label: "Verifying", value: r.posts.published, unit: "posts", owner: "Platform" },
    { label: "Live · verified", value: r.posts.verified, unit: "posts", owner: "Platform" },
    { label: "Paid", value: accepted.filter((a) => payment(a, posts).state === "paid").length, unit: "creators", owner: "Platform" },
  ];

  const chart = useMemo(() => {
    const days = Math.max(14, Math.min(120, daysBetween(campaign.startDate, TODAY) + 1));
    const keys = dayKeys(days);
    const delivered = cumulative(dailyViews(posts.filter((p) => p.status === "verified"), keys));
    const series = [{ id: "views", label: "Verified views (cumulative)", values: delivered }];
    if (campaign.guarantee?.minViews) series.push({ id: "g", label: `Guaranteed ${compact(campaign.guarantee.minViews)}`, values: keys.map(() => campaign.guarantee!.minViews), dashed: true } as never);
    return { keys, series };
  }, [campaign, posts]);

  const projected = projectedViews(campaign, world);
  const actions = inboxItems(world, BUSINESS.id).filter((i) => i.campaignId === campaign.id && i.needsAction);
  const schedule = posts
    .filter((p) => ["not_started", "revision_requested", "draft_submitted", "approved"].includes(p.status))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  const committedUnpaid = r.committed - r.spent;

  if (campaign.status === "draft") {
    return (
      <div className="surface p-6 text-sm">
        <p>This campaign is a draft. Publishing runs matching: automatic creator sets invite creators straight away, manual sets get recommendations for you to approve.</p>
        <Link href={`/business/campaigns/${campaign.id}/edit`} className="mt-3 inline-flex items-center gap-1 font-medium text-primary">
          Review & publish <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pipeline */}
      <section className="surface overflow-x-auto">
        <ol className="grid min-w-[880px] grid-cols-8 divide-x">
          {pipeline.map((s) => (
            <li key={s.label} className={cn("p-3.5", s.highlight && "bg-warning-subtle/50")}>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">
                {s.unit} · <span className={cn(s.owner === "You" && "font-medium text-foreground")}>{s.owner}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 @5xl/main:grid-cols-3">
        {/* Guarantee */}
        <section className="surface @5xl/main:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                Delivered vs guaranteed <DataTag kind="verified" />
              </h3>
              <p className="text-xs text-muted-foreground">Cumulative verified organic views since launch</p>
            </div>
            {campaign.guarantee?.minViews ? (
              <div className="text-right">
                <div className="text-xl font-semibold tracking-tight tabular-nums">{pct((r.delivery ?? 0) * 100)}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {compact(r.views)} of {compact(campaign.guarantee.minViews)}
                  {r.pendingViews > 0 && ` · +${compact(r.pendingViews)} verifying`}
                </div>
              </div>
            ) : null}
          </div>
          <div className="px-2 pt-3">
            <TrendChart keys={chart.keys} series={chart.series} format={compact} height={220} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5">
            <Legend series={chart.series} />
            {campaign.status === "active" && campaign.guarantee?.minViews ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <DataTag kind="estimate" /> Projected at close: <span className="font-medium text-foreground tabular-nums">{compact(projected)}</span>
                {projected < campaign.guarantee.minViews && <span className="font-medium text-warning-text">· at risk</span>}
              </span>
            ) : null}
          </div>
          {campaign.guarantee && (
            <dl className="grid grid-cols-2 gap-px border-t bg-border text-xs @3xl/main:grid-cols-4">
              {(
                [
                  ["Measurement window", `${campaign.guarantee.windowDays} days from each post`],
                  ["Platforms", campaign.guarantee.platforms.map((p) => PLATFORMS[p].label).join(", ")],
                  ["Verification", `${campaign.guarantee.verification}. Fraud and removed posts excluded.`],
                  ["Remedy if short", REMEDIES[campaign.guarantee.remedy]],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="bg-card p-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5 font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>

        {/* Budget */}
        <section className="surface p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-sm font-semibold">Budget</h3>
            <span className="text-xs text-muted-foreground tabular-nums">{usd(campaign.budget)} total</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tracking-tight tabular-nums">{usd(Math.max(0, r.available))}</span>
            <span className="text-sm text-muted-foreground">uncommitted</span>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(
              [
                ["Spent (posts verified)", r.spent, "bg-chart-1"],
                ["Committed, due on verification", committedUnpaid, "bg-chart-1/45"],
                ["Reserved for open invitations", r.reserved, "bg-chart-1/20"],
                ["Uncommitted", Math.max(0, r.available), "bg-muted"],
              ] as const
            ).map(([label, v, cls]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-sm", cls)} />
                <span className="flex-1 text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{usd(v)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            Includes a {PLATFORM_FEE_RATE * 100}% platform fee on creator fees.{" "}
            {campaign.allocation === "automatic" ? "Uncommitted budget is allocated automatically to future invitations; accepted fees never change." : "Allocated manually per creator set."}
          </p>
          {r.results > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3">
              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {OBJECTIVES[campaign.objective].resultPlural} {campaign.objective !== "awareness" && <DataTag kind="attributed" />}
                </div>
                <div className="font-semibold tabular-nums">{compact(r.results)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{campaign.objective === "awareness" ? "Cost per 1K views" : "Cost per result"}</div>
                <div className="font-semibold tabular-nums">{campaign.objective === "awareness" ? (r.ecpm ? usd(r.ecpm, true) : "—") : r.costPerResult ? usd(r.costPerResult, true) : "—"}</div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Creator set comparison */}
      <section className="surface overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div>
            <h3 className="text-sm font-semibold">Creator set performance</h3>
            <p className="text-xs text-muted-foreground">
              {sets.length > 1 ? "Observed differences between strategies. Not a controlled experiment." : "Add creator sets to compare audiences and creator strategies."}
            </p>
          </div>
          <Link href="/business/campaigns" className="text-xs font-medium text-primary hover:underline">
            Open in Campaigns
          </Link>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Creator set</th>
              <th className="px-4 py-2 text-right font-medium">Creators</th>
              <th className="px-4 py-2 text-right font-medium">Committed</th>
              <th className="px-4 py-2 text-right font-medium">Est. views</th>
              <th className="px-4 py-2 text-right font-medium">Verified views</th>
              <th className="px-4 py-2 text-right font-medium">Views vs est.</th>
              <th className="px-4 py-2 text-right font-medium">Effective CPM</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {sets.map((s) => {
              const sr = setRollup(s, campaign, world);
              const verifiedEst = sum(posts.filter((p) => p.setId === s.id && p.status === "verified").map((p) => {
                const a = activations.find((x) => x.id === p.activationId)!;
                return a.estViews[1] / posts.filter((x) => x.activationId === a.id).length;
              }));
              return (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5">
                    <button className="text-left" onClick={() => goTo("sets", { set: s.id })}>
                      <span className="block font-medium hover:underline">{s.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <PlatformIconRow platforms={s.platforms} />
                        {s.hypothesis}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{sr.creators.accepted}<span className="text-muted-foreground">/{sr.creators.accepted + sr.creators.invited}</span></td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{usd(sr.committed)}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{compact(sr.estViews[1])}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{sr.views ? compact(sr.views) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {verifiedEst ? <span className={sr.views >= verifiedEst ? "text-success-text" : "text-warning-text"}>{pct((sr.views / verifiedEst) * 100)}</span> : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{sr.ecpm ? usd(sr.ecpm, true) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <div className="grid gap-4 @5xl/main:grid-cols-2">
        <section className="surface">
          <div className="flex items-center justify-between px-4 pt-4 pb-3">
            <h3 className="text-sm font-semibold">Outstanding actions</h3>
            <Link href="/business/inbox" className="text-xs font-medium text-primary hover:underline">
              Inbox
            </Link>
          </div>
          <ul className="divide-y border-t">
            {actions.map((i) => {
              const c = i.creatorId ? creatorById(i.creatorId) : undefined;
              return (
                <li key={i.id}>
                  <Link href={`/business/inbox?item=${i.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40">
                    {c ? <CreatorPhoto creator={c} size={28} /> : <span className="size-7 rounded-full bg-warning-subtle" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{i.body}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">{relative(i.at)}</span>
                  </Link>
                </li>
              );
            })}
            {actions.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing waiting on you.</li>}
          </ul>
        </section>

        <section className="surface">
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-sm font-semibold">Publishing schedule</h3>
            <p className="text-xs text-muted-foreground">Upcoming posts by deadline</p>
          </div>
          <ul className="divide-y border-t">
            {schedule.slice(0, 8).map((p) => {
              const c = creatorById(p.creatorId)!;
              const d = daysBetween(TODAY, p.dueAt);
              return (
                <li key={p.id}>
                  <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40" onClick={() => openPost(p.id)}>
                    <span className="w-12 shrink-0 text-xs">
                      <span className="block font-medium tabular-nums">{shortDate(p.dueAt)}</span>
                      <span className={cn("text-muted-foreground", d <= 3 && "text-warning-text")}>{d < 0 ? "overdue" : d === 0 ? "today" : `in ${d}d`}</span>
                    </span>
                    <CreatorPhoto creator={c} size={26} />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {c.name}
                      {posts.filter((x) => x.activationId === p.activationId).length > 1 && <span className="text-muted-foreground"> · post {p.index}</span>}
                    </span>
                    <PostBadge status={p.status} />
                  </button>
                </li>
              );
            })}
            {schedule.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">No upcoming posts.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
