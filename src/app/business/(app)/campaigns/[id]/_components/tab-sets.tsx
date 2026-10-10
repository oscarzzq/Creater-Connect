"use client";

import { useEffect } from "react";
import { Bot, Copy, FlaskConical, Hand, Pencil, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { COUNTRY_NAMES, compact, usd } from "@/lib/domain/format";
import { NICHE_LABEL } from "@/lib/domain/labels";
import { withPlatformFee } from "@/lib/domain/matching";
import { payment, setRollup, sum } from "@/lib/domain/metrics";
import type { Activation, CreatorSet } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { useOverlays } from "@/components/app/overlays";
import { RosterApproval } from "@/components/app/roster-approval";
import { ActivationBadge, StatusPill } from "@/components/app/status-badge";
import type { DetailProps } from "./types";

export function SetsTab({ campaign, sets, activations, posts, focusSet }: DetailProps & { focusSet?: string }) {
  const world = useAppState();
  const { openCreator, openActivation } = useOverlays();

  useEffect(() => {
    if (focusSet) document.getElementById(`set-${focusSet}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusSet]);

  // Automatic allocation: each set's share is proportional to its planned roster.
  const planned = (s: CreatorSet) => withPlatformFee(sum(activations.filter((a) => a.setId === s.id && ["recommended", "approved", "invited", "accepted"].includes(a.status) && !a.supplementary).map((a) => a.fee)));
  const totalPlanned = sum(sets.map(planned)) || 1;

  return (
    <div className="space-y-6">
      {sets.length > 1 && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <FlaskConical className="size-3.5" />
          {sets.length} creator sets in this campaign. Compare them on the Overview tab; differences are observational, not controlled tests.
        </p>
      )}
      {sets.map((s) => {
        const acts = activations.filter((a) => a.setId === s.id && a.status !== "removed");
        const reviewing = acts.filter((a) => a.status === "recommended" || a.status === "approved");
        const roster = acts.filter((a) => !["recommended", "approved"].includes(a.status));
        const r = setRollup(s, campaign, world);
        const budget = campaign.allocation === "manual" && s.budget ? s.budget : Math.round((campaign.budget * planned(s)) / totalPlanned);
        const setBudget = campaign.status === "draft" ? budget : Math.max(0, r.available + withPlatformFee(sum(reviewing.map((a) => a.fee)))) || budget;
        return (
          <section key={s.id} id={`set-${s.id}`} className={cn("surface scroll-mt-20 overflow-hidden", focusSet === s.id && "ring-2 ring-primary/40")}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 font-semibold tracking-tight">
                  {s.name}
                  {s.platforms.map((p) => (
                    <PlatformIcon key={p} platform={p} className="size-4" />
                  ))}
                </h3>
                {s.hypothesis && <p className="mt-0.5 text-sm text-muted-foreground">Hypothesis: {s.hypothesis}</p>}
              </div>
              <div className="flex gap-2">
                <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground">
                  {s.selection === "automatic" ? <Bot className="size-3.5" /> : <Hand className="size-3.5" />}
                  {s.selection === "automatic" ? "Automatic selection" : "Manual review"}
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/business/campaigns/${campaign.id}/edit?node=set:${s.id}`}>
                    <Pencil /> Edit
                  </Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => { actions.duplicateSet(s.id); toast.success("Creator set duplicated", { description: "Adjust its targeting to test a variant." }); }}>
                  <Copy />
                  Duplicate
                </Button>
                {campaign.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => {
                    if (s.selection === "automatic") { actions.fillRoster(s.id); toast("Inviting more creators within this set's budget"); }
                    else { actions.requestAlternatives(s.id); toast("Added more recommended creators"); }
                  }}>
                    <UserRoundPlus />
                    More creators
                  </Button>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-px bg-border text-sm @3xl/main:grid-cols-3 @6xl/main:grid-cols-6">
              <Item label="Platforms" value={s.platforms.map((p) => PLATFORMS[p].label).join(", ")} />
              <Item label="Audience" value={`${s.demographics.gender === "all" ? "All genders" : s.demographics.gender === "women" ? "Women" : "Men"} ${s.demographics.ageMin}–${s.demographics.ageMax} · ${s.demographics.languages.join(", ")}`} />
              <Item label="Audience geography" value={s.audienceGeo.map((c) => COUNTRY_NAMES[c] ?? c).join(", ") || "Anywhere"} />
              <Item label="Creator geography" value={s.creatorGeo.countries.length ? `${s.creatorGeo.countries.join(", ")} (${s.creatorGeo.required ? "required" : "preferred"})` : "Anywhere"} />
              <Item label="Niches" value={s.niches.map((n) => NICHE_LABEL[n]).join(", ")} />
              <Item label="Qualification" value={`≥${compact(s.qualification.minMedianViews)} median views · verified audience${s.qualification.followerRange ? ` · ${compact(s.qualification.followerRange[0])}–${compact(s.qualification.followerRange[1])} followers` : ""}`} />
            </dl>
            {s.interests.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5 text-xs">
                <span className="text-muted-foreground">Audience interests</span>
                {s.interests.map((i) => (
                  <span key={i} className="rounded-md border px-1.5 py-0.5">
                    {i}
                  </span>
                ))}
              </div>
            )}

            {reviewing.length > 0 && (
              <div className="border-t bg-canvas/60 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <StatusPill tone="warning">Needs your approval</StatusPill>
                  <span className="text-xs text-muted-foreground">{campaign.allocation === "automatic" ? `Predicted allocation ${usd(setBudget)}` : `Manual allocation ${usd(setBudget)}`}</span>
                </div>
                <RosterApproval
                  set={s}
                  campaign={campaign}
                  items={reviewing}
                  budget={setBudget}
                  onApprove={(ids) => { actions.approve(ids); toast.success(campaign.status === "draft" ? `${ids.length} approved` : `${ids.length} invited`, { description: campaign.status === "draft" ? "Offers go out when you launch." : "Creators have 7 days to accept." }); }}
                  onRemove={(id) => actions.remove(id)}
                  onUndo={(id) => actions.unapprove(id)}
                  onAlternatives={() => { actions.requestAlternatives(s.id); toast("Added alternative recommendations"); }}
                  onOpenCreator={(id) => openCreator(id, s.id)}
                />
              </div>
            )}

            {roster.length > 0 && (
              <div className="border-t">
                <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-xs text-muted-foreground">
                  <span><span className="font-semibold text-foreground tabular-nums">{r.creators.accepted}</span> accepted</span>
                  <span><span className="font-semibold text-foreground tabular-nums">{usd(r.committed)}</span> committed</span>
                  <span><span className="font-semibold text-foreground tabular-nums">{compact(r.views)}</span> verified views</span>
                  {r.ecpm && <span><span className="font-semibold text-foreground tabular-nums">{usd(r.ecpm, true)}</span> effective CPM</span>}
                </div>
                <RosterRows acts={roster} posts={posts} onOpen={openActivation} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-4 py-3">
      <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

export function RosterRows({ acts, posts, onOpen }: { acts: Activation[]; posts: DetailProps["posts"]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Creator</th>
            <th className="px-4 py-2 text-left font-medium">Offer</th>
            <th className="px-4 py-2 text-left font-medium">Content</th>
            <th className="px-4 py-2 text-right font-medium">Fixed fee</th>
            <th className="px-4 py-2 text-right font-medium">Est. views</th>
            <th className="px-4 py-2 text-right font-medium">Verified views</th>
            <th className="px-4 py-2 text-right font-medium">Payment</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {acts.map((a) => {
            const c = creatorById(a.creatorId)!;
            const mine = posts.filter((p) => p.activationId === a.id);
            const views = sum(mine.filter((p) => p.status === "verified").map((p) => p.metrics?.views ?? 0));
            const pay = payment(a, posts);
            return (
              <tr key={a.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onOpen(a.id)}>
                <td className="px-4 py-2.5">
                  <span className="flex items-center gap-2.5">
                    <CreatorPhoto creator={c} size={28} />
                    <span>
                      <span className="block font-medium">{c.name}</span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <PlatformIcon platform={a.platform} className="size-3" />
                        Fit {a.matchScore}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <ActivationBadge status={a.status} supplementary={a.supplementary} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {mine.length ? (
                    <span className="flex items-center gap-1">
                      {mine.map((p) => (
                        <span key={p.id} title={p.status} className={cn("size-2 rounded-full", p.status === "verified" ? "bg-success" : p.status === "draft_submitted" ? "bg-warning" : p.status === "revision_requested" ? "bg-destructive" : ["approved", "published"].includes(p.status) ? "bg-primary" : "bg-muted-foreground/30")} />
                      ))}
                      <span className="ml-1 text-muted-foreground">{mine.filter((p) => p.status === "verified").length}/{mine.length} live</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{usd(a.fee)}</td>
                <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{compact(a.estViews[1])}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">{views ? compact(views) : "—"}</td>
                <td className="px-4 py-2.5 text-right text-xs">
                  {a.supplementary ? <span className="text-muted-foreground">Covered by us</span> : pay.state === "paid" ? <span className="text-success-text">Paid</span> : pay.state === "processing" ? "Verifying" : a.status === "accepted" ? <span className="text-muted-foreground">On verification</span> : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
