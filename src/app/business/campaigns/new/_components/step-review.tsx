"use client";

import { CreditCard, Pencil, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORMS, PlatformIcon, PlatformIconRow } from "@/components/platform-icon";
import { CreatorPhoto, CreatorStack } from "@/components/app/creator-photo";
import { DataTag } from "@/components/app/status-badge";
import { creatorById } from "@/lib/domain/creators";
import { COUNTRY_NAMES, compact, shortDate, usd } from "@/lib/domain/format";
import { CTAS, NICHE_LABEL, OBJECTIVES, REMEDIES } from "@/lib/domain/labels";
import { PLATFORM_FEE_RATE, guaranteeFloor, withPlatformFee } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import type { Guarantee } from "@/lib/domain/types";
import type { StepId, StepProps } from "./builder-state";

export function launchSummary(draft: StepProps["draft"]) {
  const approved = draft.activations.filter((a) => a.status === "approved");
  const fees = sum(approved.map((a) => a.fee));
  const total = withPlatformFee(fees);
  const views = [0, 1, 2].map((i) => sum(approved.map((a) => a.estViews[i])));
  const eligible = approved.length >= 3;
  return { approved, fees, total, views, floor: eligible ? guaranteeFloor(approved.map((a) => a.estViews[0])) : 0, eligible };
}

export function StepReview({ draft, setCampaign, goTo }: StepProps & { goTo: (s: StepId) => void }) {
  const c = draft.campaign;
  const s = launchSummary(draft);
  const g = c.guarantee!;
  const platforms = [...new Set(draft.sets.flatMap((x) => x.platforms))];

  return (
    <div className="space-y-5">
      <section className="surface overflow-hidden">
        <Group title="Campaign" onEdit={() => goTo("basics")}>
          <Row k="Name">{c.name}</Row>
          <Row k="Objective">{OBJECTIVES[c.objective].label} · measured by {OBJECTIVES[c.objective].tracking.toLowerCase()}</Row>
          <Row k="Promoting">{c.promoting.kind === "brand" ? `${c.businessName} (brand awareness)` : c.promoting.name}</Row>
          <Row k="Dates">{shortDate(c.startDate)} – {shortDate(c.endDate)}</Row>
          <Row k="Budget">{usd(c.budget)} · {c.allocation} allocation</Row>
        </Group>
        <Group title="Creator sets & audiences" onEdit={() => goTo("sets")}>
          {draft.sets.map((set) => {
            const approved = s.approved.filter((a) => a.setId === set.id);
            return (
              <div key={set.id} className="grid grid-cols-[140px_1fr] gap-4 text-sm">
                <dt className="flex items-center gap-1.5 font-medium">
                  <PlatformIconRow platforms={set.platforms} />
                </dt>
                <dd>
                  <div className="font-medium">{set.name}</div>
                  <div className="text-muted-foreground">
                    {set.demographics.gender === "all" ? "All" : set.demographics.gender === "women" ? "Women" : "Men"} {set.demographics.ageMin}–{set.demographics.ageMax} in {set.audienceGeo.map((x) => COUNTRY_NAMES[x] ?? x).join(", ")} · {set.niches.map((n) => NICHE_LABEL[n]).join(", ")}
                    {set.interests.length > 0 && ` · ${set.interests.slice(0, 3).join(", ")}`}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <CreatorStack creators={approved.map((a) => creatorById(a.creatorId)!)} size={22} max={6} />
                    <span className="text-xs text-muted-foreground">{approved.length} approved</span>
                  </div>
                </dd>
              </div>
            );
          })}
        </Group>
        <Group title={`Approved roster · ${s.approved.length} creators`} onEdit={() => goTo("matching")}>
          <ul className="divide-y rounded-lg border">
            {s.approved.map((a) => {
              const cr = creatorById(a.creatorId)!;
              return (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <CreatorPhoto creator={cr} size={26} />
                  <span className="min-w-0 flex-1 truncate">{cr.name}</span>
                  <PlatformIcon platform={a.platform} className="size-3.5" />
                  <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">~{compact(a.estViews[1])} views</span>
                  <span className="w-16 text-right font-medium tabular-nums">{usd(a.fee)}</span>
                </li>
              );
            })}
          </ul>
        </Group>
        <Group title="Creative brief" onEdit={() => goTo("brief")} last>
          <Row k="Deliverables">{c.brief.deliverables} × short-form video ({c.brief.videoLength}) per creator</Row>
          <Row k="Call to action">{CTAS[c.brief.cta.type]} · {c.brief.cta.destination}</Row>
          <Row k="Draft review">{c.brief.review.required ? `Required · ${c.brief.review.revisionRounds} revision round(s)` : "Creators publish directly"}</Row>
          <Row k="Content rights">{c.brief.rights.paidUsage ? `Organic + paid usage, ${c.brief.rights.months} months` : "Creator-posted organic only"}</Row>
          <Row k="Fulfillment">{c.brief.fulfillment.kind === "none" ? "None" : c.brief.fulfillment.details}</Row>
        </Group>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-success" /> Delivery guarantee
          </h3>
          {s.eligible ? (
            <>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight tabular-nums">{compact(s.floor)}</span>
                <span className="text-sm text-muted-foreground">verified organic views, minimum</span>
                <DataTag kind="guaranteed" />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Expected {compact(s.views[0])}–{compact(s.views[2])} <DataTag kind="estimate" className="ml-1 align-middle" />
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <Row k="Platforms">{platforms.map((p) => PLATFORMS[p].label).join(", ")}</Row>
                <Row k="Window">{g.windowDays} days from each post</Row>
                <Row k="Counts">Organic views only. Paid boosts, removed or deleted posts and fraudulent views are excluded.</Row>
                <Row k="Verification">{g.verification}</Row>
                <Row k="If we fall short">
                  <Select value={g.remedy} onValueChange={(v) => setCampaign((x) => ({ ...x, guarantee: { ...x.guarantee!, remedy: v as Guarantee["remedy"] } }))}>
                    <SelectTrigger size="sm" className="h-8 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{(Object.keys(REMEDIES) as Guarantee["remedy"][]).map((r) => <SelectItem key={r} value={r}>{REMEDIES[r]}</SelectItem>)}</SelectContent>
                  </Select>
                </Row>
              </dl>
              <p className="mt-3 text-xs text-muted-foreground">Sales, leads and installs are tracked but never guaranteed. Creators are paid in full for completed posts; view risk sits with us.</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Approve at least 3 creators to qualify for a guaranteed view floor.</p>
          )}
        </section>

        <section className="surface p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="size-4 text-muted-foreground" /> Payment
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">Creator fees ({s.approved.length})</dt><dd className="tabular-nums">{usd(s.fees)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Platform fee ({PLATFORM_FEE_RATE * 100}%)</dt><dd className="tabular-nums">{usd(s.total - s.fees)}</dd></div>
            <div className="flex justify-between border-t pt-2 font-medium"><dt>Authorized at launch</dt><dd className="tabular-nums">{usd(s.total)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Budget left for replacements & new sets</dt><dd className="tabular-nums">{usd(c.budget - s.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Charged per creator once their posts are verified. Offers a creator declines or lets expire are released. Card on file (demo) via our payments provider.
          </p>
          {c.budget - s.total < 0 && <p className="mt-2 text-xs font-medium text-destructive-text">Approved fees exceed your budget. Remove creators or raise the budget.</p>}
        </section>
      </div>
    </div>
  );
}

function Group({ title, onEdit, children, last }: { title: string; onEdit: () => void; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "p-5" : "border-b p-5"}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
      </div>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
