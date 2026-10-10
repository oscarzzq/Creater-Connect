"use client";

import { useState } from "react";
import { ChevronDown, Minus, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CTAS } from "@/lib/domain/labels";
import type { Brief, CtaType } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { FieldLabel, FormSection, Helper } from "./form-section";
import type { StepProps } from "./builder-state";

const MEASUREMENT: Record<CtaType, string> = {
  website: "UTM link clicks",
  promo_code: "Promo code redemptions + UTM link",
  tracked_link: "Tracked / affiliate link clicks and purchases",
  link_in_bio: "UTM link in bio",
  app_download: "Install attribution link",
  signup: "Signups via tracked link",
  comment_keyword: "Keyword comments (manual count)",
  visit_store: "In-store code redemptions",
};

export function StepBrief({ draft, mode, setCampaign }: StepProps) {
  const b = draft.campaign.brief;
  const set = (patch: Partial<Brief>) => setCampaign((c) => ({ ...c, brief: { ...c.brief, ...patch } }));
  const [moreOpen, setMoreOpen] = useState(mode === "advanced");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
        This is the default brief for every creator in the campaign. Creators keep their own voice; you set the must-haves.
      </div>

      <FormSection title="Product information">
        <div className="space-y-4">
          <div>
            <FieldLabel>Key benefits</FieldLabel>
            <ListEditor value={b.benefits} onChange={(benefits) => set({ benefits })} placeholder="Add a benefit…" />
          </div>
          <div>
            <FieldLabel htmlFor="aud">Intended audience</FieldLabel>
            <Input id="aud" className="h-9" value={b.intendedAudience} onChange={(e) => set({ intendedAudience: e.target.value })} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Creative requirements">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <FieldLabel>Format</FieldLabel>
            <Select value={b.format} onValueChange={(v) => set({ format: v as Brief["format"] })}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="short_video">Short-form video</SelectItem>
                <SelectItem value="image">Image post</SelectItem>
                <SelectItem value="carousel">Carousel (where supported)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Posts per creator</FieldLabel>
            <div className="flex h-9 w-fit items-center rounded-lg border">
              <button type="button" className="flex size-9 items-center justify-center text-muted-foreground disabled:opacity-40" onClick={() => set({ deliverables: Math.max(1, b.deliverables - 1) })} disabled={b.deliverables <= 1} aria-label="Fewer posts"><Minus className="size-3.5" /></button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">{b.deliverables}</span>
              <button type="button" className="flex size-9 items-center justify-center text-muted-foreground" onClick={() => set({ deliverables: Math.min(5, b.deliverables + 1) })} aria-label="More posts"><Plus className="size-3.5" /></button>
            </div>
          </div>
          <div>
            <FieldLabel>Video length</FieldLabel>
            <Select value={b.videoLength} onValueChange={(v) => set({ videoLength: v })}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{["15–30s", "20–30s", "30–45s", "45–60s", "60–90s"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <FieldLabel htmlFor="tone">Tone & style</FieldLabel>
            <Input id="tone" className="h-9" value={b.tone} onChange={(e) => set({ tone: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Key talking points</FieldLabel>
            <ListEditor value={b.talkingPoints} onChange={(talkingPoints) => set({ talkingPoints })} placeholder="Add a talking point…" />
          </div>
          <div>
            <FieldLabel htmlFor="demo" hint="Optional">Mandatory product demonstration</FieldLabel>
            <Input id="demo" className="h-9" value={b.mandatoryDemo} onChange={(e) => set({ mandatoryDemo: e.target.value })} placeholder="e.g. Apply on camera in natural light" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Required mentions</FieldLabel>
              <ListEditor value={b.requiredMentions} onChange={(requiredMentions) => set({ requiredMentions })} placeholder="@handle, #hashtag, code" tone="success" />
            </div>
            <div>
              <FieldLabel>Prohibited claims or content</FieldLabel>
              <ListEditor value={b.prohibited} onChange={(prohibited) => set({ prohibited })} placeholder="Add a rule…" tone="danger" />
            </div>
          </div>
          <div>
            <FieldLabel hint="Links to example videos">Reference videos</FieldLabel>
            <ListEditor value={b.references} onChange={(references) => set({ references })} placeholder="https://" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Call to action" description="What viewers should do, and how we'll measure it.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel>Action</FieldLabel>
            <Select value={b.cta.type} onValueChange={(v) => set({ cta: { ...b.cta, type: v as CtaType, measurement: MEASUREMENT[v as CtaType] } })}>
              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.keys(CTAS) as CtaType[]).map((k) => <SelectItem key={k} value={k}>{CTAS[k]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="dest">{b.cta.type === "promo_code" ? "Code & destination" : b.cta.type === "comment_keyword" ? "Keyword" : "Destination / tracking link"}</FieldLabel>
            <Input id="dest" className="h-9" value={b.cta.destination} onChange={(e) => set({ cta: { ...b.cta, destination: e.target.value } })} placeholder={b.cta.type === "promo_code" ? "GLOW15 · glowinc.co/…" : "https://"} />
          </div>
        </div>
        <div className="mt-4">
          <FieldLabel htmlFor="meas">Measurement method</FieldLabel>
          <Input id="meas" className="h-9" value={b.cta.measurement} onChange={(e) => set({ cta: { ...b.cta, measurement: e.target.value } })} />
          <Helper>Reported as attributed results, separate from verified view delivery.</Helper>
        </div>
      </FormSection>

      <section className="rounded-xl border bg-card">
        <button type="button" onClick={() => setMoreOpen((o) => !o)} className="flex w-full items-center justify-between p-6 text-left" aria-expanded={moreOpen}>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Creative variations & script</h2>
            <p className="text-sm text-muted-foreground">{b.hooks.length} suggested hooks · {b.script.mode === "freedom" ? "full creative freedom" : b.script.mode === "required_statements" ? "required statements" : "full script"}</p>
          </div>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
        </button>
        {moreOpen && (
          <div className="space-y-5 border-t p-6">
            <div>
              <FieldLabel hint="Alternatives creators can choose from">Suggested hooks</FieldLabel>
              <ListEditor value={b.hooks} onChange={(hooks) => set({ hooks })} placeholder="Add an opening line…" />
              <Helper>Published organic posts can&apos;t be edited later. We use results to suggest hooks for future creators.</Helper>
            </div>
            <div>
              <FieldLabel>Script</FieldLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {(
                  [
                    ["freedom", "Creative freedom", "Creator writes it; brief must-haves still apply"],
                    ["required_statements", "Required statements", "Specific lines they must say"],
                    ["full_script", "Full script", "You supply the script"],
                  ] as const
                ).map(([k, label, body]) => (
                  <button key={k} type="button" onClick={() => set({ script: { ...b.script, mode: k } })} className={cn("rounded-lg border bg-card p-3 text-left hover:border-foreground/20", b.script.mode === k && "border-primary bg-brand-subtle/60 ring-1 ring-primary")}>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{body}</span>
                  </button>
                ))}
              </div>
              {b.script.mode !== "freedom" && <Textarea className="mt-2 resize-none" rows={3} value={b.script.text} onChange={(e) => set({ script: { ...b.script, text: e.target.value } })} placeholder={b.script.mode === "required_statements" ? "e.g. Say: “Use code GLOW15 for 15% off.”" : "Paste your script"} />}
              <Helper>We recommend creative freedom with required statements. Authentic content tends to get more organic reach.</Helper>
            </div>
          </div>
        )}
      </section>

      <FormSection title="Review, rights & fulfillment">
        <div className="space-y-5">
          <div>
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Review drafts before publishing</span>
                <span className="block text-xs text-muted-foreground">Off: creators publish directly, as long as the brief&apos;s requirements are met.</span>
              </span>
              <Switch checked={b.review.required} onCheckedChange={(v) => set({ review: { ...b.review, required: v } })} />
            </label>
            {b.review.required && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Revision rounds included</FieldLabel>
                  <Select value={String(b.review.revisionRounds)} onValueChange={(v) => set({ review: { ...b.review, revisionRounds: Number(v) } })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{[0, 1, 2].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Your review turnaround</FieldLabel>
                  <Select value={String(b.review.turnaroundDays)} onValueChange={(v) => set({ review: { ...b.review, turnaroundDays: Number(v) } })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 2, 3].map((n) => <SelectItem key={n} value={String(n)}>{n} business day{n > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <div className="border-t pt-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-sm font-medium">Paid ad or repost rights</span>
                <span className="block text-xs text-muted-foreground">Default is creator-posted organic only. Adding usage rights may raise fees.</span>
              </span>
              <Switch checked={b.rights.paidUsage} onCheckedChange={(v) => set({ rights: { paidUsage: v, months: v ? 3 : 0, channels: v ? "Paid social (Meta, TikTok)" : "" } })} />
            </label>
            {b.rights.paidUsage && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>License duration</FieldLabel>
                  <Select value={String(b.rights.months)} onValueChange={(v) => set({ rights: { ...b.rights, months: Number(v) } })}>
                    <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{[1, 3, 6, 12].map((m) => <SelectItem key={m} value={String(m)}>{m} month{m > 1 ? "s" : ""}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="chan">Channels</FieldLabel>
                  <Input id="chan" className="h-9" value={b.rights.channels} onChange={(e) => set({ rights: { ...b.rights, channels: e.target.value } })} />
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-4 border-t pt-5 sm:grid-cols-[200px_1fr]">
            <div>
              <FieldLabel>Fulfillment</FieldLabel>
              <Select value={b.fulfillment.kind} onValueChange={(v) => set({ fulfillment: { ...b.fulfillment, kind: v as Brief["fulfillment"]["kind"] } })}>
                <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Ship a physical product</SelectItem>
                  <SelectItem value="access">Software / service access</SelectItem>
                  <SelectItem value="none">Nothing needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {b.fulfillment.kind !== "none" && (
              <div>
                <FieldLabel htmlFor="ful">{b.fulfillment.kind === "ship" ? "Shipping details & responsibility" : "Access instructions"}</FieldLabel>
                <Input id="ful" className="h-9" value={b.fulfillment.details} onChange={(e) => set({ fulfillment: { ...b.fulfillment, details: e.target.value } })} />
              </div>
            )}
          </div>
        </div>
      </FormSection>
    </div>
  );
}

function ListEditor({ value, onChange, placeholder, tone }: { value: string[]; onChange: (v: string[]) => void; placeholder: string; tone?: "success" | "danger" }) {
  const [text, setText] = useState("");
  const add = () => {
    if (text.trim()) onChange([...value, text.trim()]);
    setText("");
  };
  return (
    <div>
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={`${v}-${i}`} className="group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted/60">
            <span className={cn("size-1.5 shrink-0 rounded-full", tone === "success" ? "bg-success" : tone === "danger" ? "bg-destructive" : "bg-muted-foreground/50")} />
            <span className="flex-1">{v}</span>
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100" aria-label="Remove">
              <X className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add} placeholder={placeholder} className="mt-1 h-8 border-dashed" />
    </div>
  );
}
