"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformIconRow } from "@/components/platform-icon";
import { CreatorStack } from "@/components/app/creator-photo";
import { DataTag } from "@/components/app/status-badge";
import { Segmented } from "@/components/app/trend-chart";
import { createCampaign } from "@/app/actions/campaigns";
import { actions } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES } from "@/lib/domain/labels";
import { matchSet, recommendRoster, withPlatformFee } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import type { Activation, Campaign, CreatorSet } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { STEPS, initialDraft, refreshRecommendations, setBudget, stepValid, withFreshIds, type Draft, type Mode, type StepId } from "./builder-state";
import { StepBasics } from "./step-basics";
import { StepSets } from "./step-sets";
import { StepBrief } from "./step-brief";
import { StepMatching } from "./step-matching";
import { StepReview, launchSummary } from "./step-review";

const COPY: Record<StepId, { title: string; description: string }> = {
  basics: { title: "Objective & basics", description: "What you're promoting, what success looks like, and how much you want to spend." },
  sets: { title: "Who do you want to reach?", description: "Define the audience and the kind of creators to match." },
  brief: { title: "Brief & creative direction", description: "What creators need to make. They keep their own voice; you set the must-haves." },
  matching: { title: "Review recommended creators", description: "Approve the creators you want. Nothing is committed until you launch." },
  review: { title: "Review & launch", description: "Check everything, then launch to send fixed-fee offers." },
};

export function CampaignBuilder() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [mode, setMode] = useState<Mode>("guided");
  const [step, setStep] = useState<StepId>("basics");
  const scrollRef = useRef<HTMLDivElement>(null);
  const index = STEPS.findIndex((s) => s.id === step);

  const setCampaign = (fn: (c: Campaign) => Campaign) => setDraft((d) => ({ ...d, campaign: fn(d.campaign) }));
  const setSets = (fn: (s: CreatorSet[]) => CreatorSet[]) => setDraft((d) => ({ ...d, sets: fn(d.sets) }));
  const setActivations = (fn: (a: Activation[]) => Activation[]) => setDraft((d) => ({ ...d, activations: fn(d.activations) }));
  const props = { draft, mode, setCampaign, setSets, setActivations };

  function goTo(id: StepId) {
    // Recommendations are (re)generated when matching opens, for any set whose targeting changed.
    if (id === "matching" || id === "review") setDraft((d) => refreshRecommendations(d));
    setStep(id);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  function persist(launch: boolean) {
    const s = launchSummary(draft);
    const saved = withFreshIds(draft);
    const campaign: Campaign = {
      ...saved.campaign,
      guarantee: s.eligible ? { ...draft.campaign.guarantee!, minViews: s.floor, platforms: [...new Set(draft.sets.flatMap((x) => x.platforms))] } : undefined,
    };
    actions.saveCampaign(campaign, saved.sets, saved.activations.filter((a) => a.status !== "removed"));
    if (launch) actions.launch(campaign.id);
    return campaign;
  }

  async function launch() {
    const c = persist(true);
    const s = launchSummary(draft);
    // Also persist to Supabase when signed in (legacy schema); the demo store always has the full campaign.
    try {
      const fd = new FormData();
      fd.set("title", c.name);
      fd.set("brief", `${c.promoting.name}\n\n${c.promoting.description}`);
      fd.set("budget_usd", String(c.budget));
      fd.set("niche", draft.sets[0]?.niches[0] ?? "lifestyle");
      fd.set("min_followers", "0");
      fd.set("max_payout_usd", String(Math.max(...s.approved.map((a) => a.fee))));
      await createCampaign(fd);
    } catch {
      // not signed in: demo mode
    }
    toast.success(`${c.name} launched`, { description: `${s.approved.length} creators invited · ${usd(s.total)} authorized. Creators have 7 days to accept.` });
    router.push(`/business/campaigns/${c.id}`);
  }

  function saveDraft() {
    const c = persist(false);
    toast("Draft saved", { description: "Find it under Campaigns. Recommendations stay ready to review." });
    router.push(`/business/campaigns/${c.id}?tab=sets`);
  }

  const summary = useMemo(() => launchSummary(draft), [draft]);

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 sm:px-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/business/campaigns" aria-label="Exit builder">
                <X />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Exit without saving</TooltipContent>
        </Tooltip>
        <span className="h-5 w-px bg-border" />
        <LogoMark className="size-6" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{draft.campaign.name || "Untitled campaign"}</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">Draft</Badge>
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Segmented value={mode} onChange={setMode} options={[["guided", "Guided"], ["advanced", "Advanced"]]} />
          <ThemeToggle />
          <Button variant="outline" className="hidden sm:inline-flex" onClick={saveDraft} disabled={!stepValid("basics", draft)}>
            Save draft
          </Button>
        </div>
      </header>

      <div className="h-0.5 bg-muted lg:hidden">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r bg-background lg:flex">
          <div className="px-5 pt-6 pb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">New campaign · {mode}</div>
          <nav className="flex-1 px-3">
            <ol>
              {STEPS.map((s, i) => {
                const current = s.id === step;
                const done = i < index && stepValid(s.id, draft);
                const reachable = STEPS.slice(0, i).every((p) => stepValid(p.id, draft));
                return (
                  <li key={s.id} className="relative">
                    {i < STEPS.length - 1 && <span aria-hidden className={cn("absolute top-8 bottom-0 left-[21px] w-px", done ? "bg-primary/40" : "bg-border")} />}
                    <button
                      type="button"
                      disabled={!reachable && !current}
                      onClick={() => goTo(s.id)}
                      aria-current={current ? "step" : undefined}
                      className={cn("relative flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent", current && "bg-accent")}
                    >
                      <span
                        className={cn(
                          "relative z-10 flex size-[22px] shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums",
                          done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-background text-primary ring-3 ring-primary/15" : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        {done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className={cn("block text-sm", current ? "font-semibold" : "font-medium", !current && !done && "text-muted-foreground")}>{s.label}</span>
                        <StepHint id={s.id} draft={draft} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        <main className="@container/main flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-6 sm:px-8 sm:py-8">
              <div className="min-w-0 flex-1">
                <div className="mb-6">
                  <div className="text-xs font-medium text-muted-foreground tabular-nums">Step {index + 1} of {STEPS.length}</div>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight">{COPY[step].title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">{COPY[step].description}</p>
                </div>
                {step === "basics" && <StepBasics {...props} />}
                {step === "sets" && <StepSets {...props} />}
                {step === "brief" && <StepBrief {...props} />}
                {step === "matching" && <StepMatching {...props} />}
                {step === "review" && <StepReview {...props} goTo={goTo} />}
              </div>
              {/* Estimates only appear once audience and creator information exists (not on the objective screen). */}
              {step !== "basics" && (
                <aside className="hidden w-[300px] shrink-0 xl:block">
                  <div className="sticky top-8">
                    <SidePanel draft={draft} step={step} />
                  </div>
                </aside>
              )}
            </div>
          </div>

          <footer className="shrink-0 border-t bg-background">
            <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-8">
              <Button variant="outline" className="h-9" onClick={() => goTo(STEPS[index - 1].id)} disabled={index === 0}>
                <ArrowLeft /> Back
              </Button>
              <div className="ml-auto flex items-center gap-3">
                {step === "review" ? (
                  <>
                    {(summary.approved.length === 0 || summary.total > draft.campaign.budget) && (
                      <span className="hidden text-xs text-destructive-text sm:inline">{summary.approved.length === 0 ? "Approve at least one creator" : "Approved fees exceed budget"}</span>
                    )}
                    <Button className="h-9 px-4" onClick={launch} disabled={summary.approved.length === 0 || summary.total > draft.campaign.budget}>
                      <Rocket /> Launch campaign
                    </Button>
                  </>
                ) : (
                  <>
                    {step === "matching" && <span className="hidden text-xs text-muted-foreground sm:inline tabular-nums">{summary.approved.length} approved · {usd(summary.total)}</span>}
                    <Button className="h-9 px-4" onClick={() => goTo(STEPS[index + 1].id)} disabled={!stepValid(step, draft)}>
                      Continue <ArrowRight />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

function StepHint({ id, draft }: { id: StepId; draft: Draft }) {
  const c = draft.campaign;
  const approved = draft.activations.filter((a) => a.status === "approved").length;
  const text =
    id === "basics" ? `${OBJECTIVES[c.objective].label} · ${usd(c.budget)}`
    : id === "sets" ? `${draft.sets.length} creator set${draft.sets.length > 1 ? "s" : ""}`
    : id === "brief" ? `${c.brief.deliverables} post${c.brief.deliverables > 1 ? "s" : ""} per creator`
    : id === "matching" ? (draft.activations.length ? `${approved} approved` : "")
    : `${shortDate(c.startDate)} – ${shortDate(c.endDate)}`;
  return text ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{text}</span> : null;
}

function SidePanel({ draft, step }: { draft: Draft; step: StepId }) {
  const c = draft.campaign;
  const summary = launchSummary(draft);
  // Before matching, preview what the matcher would recommend per set.
  const sets = draft.sets.map((s) => {
    const pool = matchSet(s, c).matches;
    const roster = recommendRoster(s, c, setBudget(draft, s));
    return { s, pool, roster, fees: withPlatformFee(sum(roster.map((m) => m.quote!.fee))), views: [0, 2].map((i) => sum(roster.map((m) => m.quote!.estViews[i]))) };
  });
  const showApproved = step === "matching" || step === "review";

  return (
    <div className="space-y-4">
      <div className="surface p-4">
        <div className="text-sm font-semibold">{showApproved ? "Your roster" : "Creator pool"}</div>
        {showApproved ? (
          <>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums">{summary.approved.length}</div>
                <div className="text-xs text-muted-foreground">creators approved</div>
              </div>
              <CreatorStack creators={summary.approved.map((a) => creatorById(a.creatorId)!)} size={26} max={4} />
            </div>
            <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Fees incl. platform fee</dt><dd className="font-medium tabular-nums">{usd(summary.total)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Budget remaining</dt><dd className={cn("font-medium tabular-nums", c.budget - summary.total < 0 && "text-destructive-text")}>{usd(c.budget - summary.total)}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-1 text-muted-foreground">Expected views <DataTag kind="estimate" /></dt><dd className="font-medium tabular-nums">{compact(summary.views[0])}–{compact(summary.views[2])}</dd></div>
              <div className="flex justify-between"><dt className="flex items-center gap-1 text-muted-foreground">Guaranteed floor</dt><dd className="font-medium tabular-nums">{summary.eligible ? compact(summary.floor) : "3+ creators"}</dd></div>
            </dl>
          </>
        ) : (
          <ul className="mt-3 space-y-3">
            {sets.map(({ s, pool, roster, fees, views }) => (
              <li key={s.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-1.5 text-xs font-medium">
                  <PlatformIconRow platforms={s.platforms} />
                  <span className="truncate">{s.name}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{pool.length}</span>
                  <span className="text-xs text-muted-foreground">creators qualify</span>
                </div>
                {pool.length > 0 ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    ~{roster.length} recommended for {usd(fees)} · {compact(views[0])}–{compact(views[1])} views <DataTag kind="estimate" className="ml-0.5 align-middle" />
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-warning-text">No one qualifies yet. Broaden geography, niche or minimum views.</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
        Estimates use each creator&apos;s recent organic median views and typical range. Fixed fees are shown before you approve anyone; nothing is committed until launch.
      </p>
    </div>
  );
}
