"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CTAS } from "@/lib/domain/labels";
import { shortDate } from "@/lib/domain/format";
import type { DetailProps } from "./types";

export function BriefTab({ campaign }: DetailProps) {
  const b = campaign.brief;
  const p = campaign.promoting;
  return (
    <div className="grid gap-4 @5xl/main:grid-cols-3">
      <div className="space-y-4 @5xl/main:col-span-2">
        <Section title="What you're promoting">
          <div className="text-sm font-medium">{p.name}</div>
          <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
          {p.url && (
            <a href={p.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {p.url.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
            </a>
          )}
          {b.benefits.length > 0 && <List title="Key benefits" items={b.benefits} />}
          {b.intendedAudience && <p className="mt-3 text-sm"><span className="text-muted-foreground">Intended audience: </span>{b.intendedAudience}</p>}
        </Section>
        <Section title="Creative requirements">
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <Def k="Format" v={`${b.deliverables} × ${b.format === "short_video" ? "short-form video" : b.format}`} />
            <Def k="Length" v={b.videoLength} />
            <Def k="Tone" v={b.tone} />
          </dl>
          {b.talkingPoints.length > 0 && <List title="Talking points" items={b.talkingPoints} />}
          {b.mandatoryDemo && <p className="mt-3 text-sm"><span className="text-muted-foreground">Mandatory demo: </span>{b.mandatoryDemo}</p>}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Required</div>
              {b.requiredMentions.map((r) => (
                <div key={r} className="flex items-center gap-2 text-sm"><Check className="size-3.5 text-success" strokeWidth={2.5} />{r}</div>
              ))}
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted-foreground">Prohibited</div>
              {b.prohibited.map((r) => (
                <div key={r} className="flex items-center gap-2 text-sm"><X className="size-3.5 text-destructive" strokeWidth={2.5} />{r}</div>
              ))}
            </div>
          </div>
        </Section>
        <Section title="Creative variations">
          {b.hooks.length ? <List title="Suggested hooks" items={b.hooks.map((h) => `“${h}”`)} /> : <p className="text-sm text-muted-foreground">No suggested hooks. Creators write their own opening.</p>}
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Script: </span>
            {b.script.mode === "freedom" ? "Full creative freedom" : b.script.mode === "required_statements" ? `Required statements · ${b.script.text}` : b.script.text}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Published organic posts can&apos;t be edited. Learnings apply to future creators and campaigns.</p>
        </Section>
      </div>
      <div className="space-y-4">
        <Section title="Call to action">
          <div className="text-sm font-medium">{CTAS[b.cta.type]}</div>
          <p className="text-sm text-muted-foreground">{b.cta.destination}</p>
          <p className="mt-2 text-xs text-muted-foreground">Measured by: {b.cta.measurement}</p>
        </Section>
        <Section title="Review & rights">
          <dl className="space-y-2 text-sm">
            <Def k="Draft review" v={b.review.required ? `Required · ${b.review.turnaroundDays}-day turnaround · ${b.review.revisionRounds} revision round${b.review.revisionRounds === 1 ? "" : "s"}` : "Creators publish directly, subject to the brief"} />
            <Def k="Content rights" v={b.rights.paidUsage ? `Organic + paid usage for ${b.rights.months} months (${b.rights.channels})` : "Creator-posted organic only"} />
          </dl>
        </Section>
        <Section title="Fulfillment">
          <p className="text-sm">{b.fulfillment.kind === "none" ? "No product needed." : b.fulfillment.details}</p>
          {b.fulfillment.expectedBy && <p className="mt-1 text-xs text-muted-foreground">Expected by {shortDate(b.fulfillment.expectedBy)}</p>}
        </Section>
        <Button variant="outline" className="w-full" onClick={() => toast("Brief edits apply to creators who haven't accepted yet (demo)")}>
          Edit brief
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm marker:text-muted-foreground">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}

function Def({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
