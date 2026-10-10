"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Eye, Flag, MessageSquare, Rocket, ShieldCheck, UserRoundPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PlatformIconRow } from "@/components/platform-icon";
import { actions, useAppState } from "@/lib/store";
import { TODAY, compact, daysBetween, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES, REMEDIES } from "@/lib/domain/labels";
import { campaignRollup, campaignStage } from "@/lib/domain/metrics";
import { cn } from "@/lib/utils";
import { Photo } from "@/components/app/photo";
import { EmptyState } from "@/components/app/section";
import { DataTag, StageBadge } from "@/components/app/status-badge";
import { OverviewTab } from "./tab-overview";
import { SetsTab } from "./tab-sets";
import { RosterTab } from "./tab-roster";
import { PostsTab } from "./tab-posts";
import { BriefTab } from "./tab-brief";

export function CampaignDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const world = useAppState();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const campaign = world.campaigns.find((c) => c.id === id);
  const tab = search.get("tab") ?? (campaign?.status === "draft" ? "sets" : "overview");

  const data = useMemo(() => {
    if (!campaign) return null;
    return {
      stage: campaignStage(campaign, world.activations, world.posts),
      sets: world.sets.filter((s) => s.campaignId === campaign.id),
      activations: world.activations.filter((a) => a.campaignId === campaign.id),
      posts: world.posts.filter((p) => p.campaignId === campaign.id),
      rollup: campaignRollup(campaign, world),
    };
  }, [campaign, world]);

  const goTo = (t: string, extra?: Record<string, string>) => router.replace(`${pathname}?${new URLSearchParams({ tab: t, ...extra })}`, { scroll: false });

  if (!campaign || !data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <EmptyState icon={Flag} title="Campaign not found" description="It may have been removed, or the demo data was reset." action={<Button asChild variant="outline"><Link href="/business/campaigns">Back to campaigns</Link></Button>} />
      </div>
    );
  }

  const { stage, sets, activations, posts, rollup: r } = data;
  const replacements = activations.filter((a) => a.status === "recommended" && a.replacementFor);
  const toReview = posts.filter((p) => p.status === "draft_submitted");
  const questions = activations.filter((a) => a.messages.at(-1)?.from === "creator");
  const approvedCount = activations.filter((a) => a.status === "approved").length;
  const daysLeft = daysBetween(TODAY, campaign.endDate);
  const elapsed = Math.max(0, Math.min(1, daysBetween(campaign.startDate, TODAY) / Math.max(1, daysBetween(campaign.startDate, campaign.endDate))));

  // One primary action: the next thing that unblocks the campaign.
  const primary =
    campaign.status === "draft"
      ? approvedCount
        ? { label: `Launch with ${approvedCount} creators`, icon: Rocket, run: () => { actions.launch(campaign.id); toast.success(`${campaign.name} launched`, { description: `${approvedCount} creators invited. They have 7 days to accept.` }); goTo("overview"); } }
        : { label: "Review recommended creators", icon: Users, run: () => goTo("sets") }
      : replacements.length
        ? { label: `Approve ${replacements.length} replacement${replacements.length > 1 ? "s" : ""}`, icon: UserRoundPlus, run: () => goTo("roster", { status: "attention" }) }
        : toReview.length
          ? { label: `Review ${toReview.length} draft${toReview.length > 1 ? "s" : ""}`, icon: Eye, run: () => goTo("posts", { status: "draft_submitted" }) }
          : questions.length
            ? { label: `Answer ${questions.length} question${questions.length > 1 ? "s" : ""}`, icon: MessageSquare, run: () => router.push("/business/inbox?cat=messages") }
            : null;

  const TABS = [
    ["overview", "Overview", undefined],
    ["sets", "Creator sets", sets.length],
    ["roster", "Roster", activations.filter((a) => !["removed"].includes(a.status)).length],
    ["posts", "Posts", posts.length],
    ["brief", "Brief", undefined],
  ] as const;

  return (
    <div>
      <div className="border-b bg-card">
        <div className="mx-auto max-w-[1400px] px-4 pt-5 sm:px-8">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/business/campaigns" className="hover:text-foreground">Campaigns</Link>
            <ChevronRight className="size-3" />
            <span className="text-foreground">{campaign.name}</span>
          </nav>
          <div className="mt-4 flex flex-wrap items-start gap-4">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-border">
              <Photo src={campaign.promoting.image} alt={campaign.promoting.name} sizes="112px" priority />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
                <StageBadge stage={stage} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {campaign.promoting.kind === "brand" ? "Brand awareness" : campaign.promoting.name} · {OBJECTIVES[campaign.objective].label} · <PlatformIconRow platforms={[...new Set(sets.flatMap((s) => s.platforms))]} className="align-[-2px]" />
              </p>
            </div>
            {primary && (
              <Button className="h-9" onClick={primary.run}>
                <primary.icon />
                {primary.label}
              </Button>
            )}
          </div>

          {campaign.makeGood && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-subtle/60 p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning-text" />
              <div>
                <span className="font-medium">Make-good in progress. </span>
                <span className="text-muted-foreground">{campaign.makeGood.reason} {campaign.makeGood.remedy}</span>
              </div>
            </div>
          )}

          <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-xl border @3xl/main:grid-cols-3 @5xl/main:grid-cols-5">
            <Fact label="Objective">
              <div className="font-medium">{OBJECTIVES[campaign.objective].label}</div>
              <div className="truncate text-xs text-muted-foreground">{OBJECTIVES[campaign.objective].tracking}</div>
            </Fact>
            <Fact label="Budget">
              <div className="font-medium tabular-nums">
                {usd(r.spent)} spent <span className="font-normal text-muted-foreground">of {usd(campaign.budget)}</span>
              </div>
              <div className="mt-1.5 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
                <div className="bg-chart-1" style={{ width: `${(r.spent / campaign.budget) * 100}%` }} />
                <div className="bg-chart-1/45" style={{ width: `${((r.committed - r.spent) / campaign.budget) * 100}%` }} />
                <div className="bg-chart-1/20" style={{ width: `${(r.reserved / campaign.budget) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">{usd(r.committed)} committed · {usd(Math.max(0, r.available))} available</div>
            </Fact>
            <Fact label="Delivery guarantee">
              {campaign.guarantee?.minViews ? (
                <>
                  <div className="flex items-center gap-1.5 font-medium tabular-nums">
                    {compact(r.views)} <span className="font-normal text-muted-foreground">/ {compact(campaign.guarantee.minViews)} views</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", (r.delivery ?? 0) >= 1 ? "bg-success" : campaign.makeGood ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, (r.delivery ?? 0) * 100)}%` }} />
                  </div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">{campaign.guarantee.windowDays}-day window · {REMEDIES[campaign.guarantee.remedy].toLowerCase()}</div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Not eligible</div>
              )}
            </Fact>
            <Fact label="Creators">
              <div className="font-medium tabular-nums">
                {r.creators.accepted} accepted <span className="font-normal text-muted-foreground">· {r.creators.invited} invited</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {sets.length} creator set{sets.length === 1 ? "" : "s"}
                {r.creators.recommended ? ` · ${r.creators.recommended} to review` : ""}
                {r.creators.supplementary ? ` · ${r.creators.supplementary} make-good` : ""}
              </div>
            </Fact>
            <Fact label="Timeline" className="col-span-2 @3xl/main:col-span-1">
              <div className="font-medium tabular-nums">{shortDate(campaign.startDate)} – {shortDate(campaign.endDate)}</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(campaign.status === "draft" ? 0 : elapsed) * 100}%` }} />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{campaign.status === "completed" ? "Completed" : campaign.status === "draft" ? "Not launched" : daysLeft >= 0 ? `${daysLeft} days left` : "Measuring"}</div>
            </Fact>
          </dl>

          <div className="mt-4 -mb-px flex gap-1 overflow-x-auto scrollbar-none" role="tablist">
            {TABS.map(([key, label, count]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => goTo(key)} className={cn("relative flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground", tab === key && "text-foreground")}>
                {label}
                {count !== undefined && <span className={cn("rounded-md bg-muted px-1.5 text-[11px] tabular-nums", tab === key && "bg-foreground text-background")}>{count}</span>}
                {tab === key && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8">
        {campaign.status !== "draft" && campaign.objective !== "awareness" && tab === "overview" && (
          <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
            <DataTag kind="attributed" /> {OBJECTIVES[campaign.objective].resultPlural} are attributed via {OBJECTIVES[campaign.objective].tracking.toLowerCase()}, not guaranteed. The guarantee covers verified organic views only.
          </p>
        )}
        {tab === "overview" && <OverviewTab campaign={campaign} {...data} goTo={goTo} />}
        {tab === "sets" && <SetsTab campaign={campaign} {...data} goTo={goTo} focusSet={search.get("set") ?? undefined} />}
        {tab === "roster" && <RosterTab campaign={campaign} {...data} goTo={goTo} initial={search.get("status") ?? undefined} />}
        {tab === "posts" && <PostsTab campaign={campaign} {...data} goTo={goTo} initial={search.get("status") ?? undefined} />}
        {tab === "brief" && <BriefTab campaign={campaign} {...data} goTo={goTo} />}
      </div>
    </div>
  );
}

function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("-mr-px -mb-px min-w-0 border-r border-b p-3.5 text-sm", className)}>
      <dt className="mb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
