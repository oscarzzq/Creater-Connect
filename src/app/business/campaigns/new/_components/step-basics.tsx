"use client";

import { Building2, Download, Globe, MousePointerClick, Package, ShoppingBag, Sparkles, Upload, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SelectableCard } from "@/components/selectable-card";
import { Photo } from "@/components/app/photo";
import { OBJECTIVES } from "@/lib/domain/labels";
import type { Objective } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { FieldLabel, FormSection, Helper, MoneyInput } from "./form-section";
import type { StepProps } from "./builder-state";

const OBJ_ICON: Record<Objective, typeof Sparkles> = { awareness: Sparkles, traffic: MousePointerClick, leads: UserPlus, sales: ShoppingBag, app: Download };
const IMAGES = ["c-brushes", "c-serum-white", "c-jars", "c-pump", "c-tube", "c-amber"];

export function StepBasics({ draft, mode, setCampaign }: StepProps) {
  const c = draft.campaign;
  const update = (patch: Partial<typeof c>) => setCampaign((x) => ({ ...x, ...patch }));
  const promo = (patch: Partial<typeof c.promoting>) => setCampaign((x) => ({ ...x, promoting: { ...x.promoting, ...patch } }));
  const days = Math.round((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / 86_400_000);

  return (
    <div className="space-y-5">
      <FormSection title="Campaign name">
        <Input className="h-9" value={c.name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Spring lip oil launch" aria-label="Campaign name" />
      </FormSection>

      <FormSection title="Objective" description="Sets the main metric in your reports. Guarantees are always on verified organic views; sales, leads and installs are tracked, not guaranteed.">
        <div role="radiogroup" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(OBJECTIVES) as Objective[]).map((o) => {
            const Icon = OBJ_ICON[o];
            const selected = c.objective === o;
            return (
              <SelectableCard key={o} selected={selected} onSelect={() => update({ objective: o })}>
                <span className={cn("flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground", selected && "bg-primary text-primary-foreground")}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="space-y-1 pr-6">
                  <span className="block font-medium">{OBJECTIVES[o].label}</span>
                  <span className="block text-sm text-muted-foreground">{OBJECTIVES[o].description}</span>
                </span>
                <span className="text-xs text-muted-foreground">Measured by: {OBJECTIVES[o].tracking.toLowerCase()}</span>
              </SelectableCard>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="What are you promoting?">
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {(
            [
              ["product", "Product", Package],
              ["service", "Service", Wrench],
              ["brand", "Brand / general awareness", Building2],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={c.promoting.kind === k}
              onClick={() => promo({ kind: k, name: k === "brand" ? c.businessName : c.promoting.name })}
              className={cn("flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium hover:border-foreground/20", c.promoting.kind === k && "border-primary bg-brand-subtle/60 ring-1 ring-primary")}
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
            </button>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_200px]">
          <div className="space-y-4">
            {c.promoting.kind !== "brand" && (
              <div>
                <FieldLabel htmlFor="pname">{c.promoting.kind === "product" ? "Product name" : "Service name"}</FieldLabel>
                <Input id="pname" className="h-9" value={c.promoting.name} onChange={(e) => promo({ name: e.target.value })} />
              </div>
            )}
            <div>
              <FieldLabel htmlFor="pdesc" hint="Creators read this first">Description</FieldLabel>
              <Textarea id="pdesc" rows={3} className="resize-none" value={c.promoting.description} onChange={(e) => promo({ description: e.target.value })} placeholder={c.promoting.kind === "brand" ? "What your brand stands for and who it's for" : "What it is, who it's for, why it's different"} />
            </div>
            <div>
              <FieldLabel htmlFor="purl">Website or landing page</FieldLabel>
              <div className="flex h-9 items-center gap-2 rounded-lg border border-input px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
                <Globe className="size-4 text-muted-foreground" />
                <input id="purl" className="w-full bg-transparent text-sm outline-none" value={c.promoting.url} onChange={(e) => promo({ url: e.target.value })} placeholder="https://" />
              </div>
            </div>
          </div>
          <div>
            <FieldLabel>Images</FieldLabel>
            <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border">
              <Photo src={c.promoting.image} alt="" sizes="200px" />
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1">
              {IMAGES.map((img) => (
                <button key={img} type="button" onClick={() => promo({ image: img })} className={cn("relative aspect-square overflow-hidden rounded-md ring-1 ring-border", c.promoting.image === img && "ring-2 ring-primary")} aria-label="Use image">
                  <Photo src={img} alt="" sizes="40px" />
                </button>
              ))}
            </div>
            <button type="button" onClick={() => toast("Upload (demo)")} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:bg-muted/40">
              <Upload className="size-3.5" /> Upload images or brand assets
            </button>
          </div>
        </div>
      </FormSection>

      <FormSection title="Budget & dates" description="One total budget covers creator fees and a 10% platform fee. You'll see each creator's fixed fee before anything is committed.">
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <FieldLabel>Total budget</FieldLabel>
            <MoneyInput value={c.budget} onChange={(v) => update({ budget: v })} />
          </div>
          <div>
            <FieldLabel htmlFor="start">Start</FieldLabel>
            <Input id="start" type="date" className="h-9" value={c.startDate.slice(0, 10)} onChange={(e) => update({ startDate: `${e.target.value}T00:00:00` })} />
          </div>
          <div>
            <FieldLabel htmlFor="end" hint={days > 0 ? `${days} days` : undefined}>End</FieldLabel>
            <Input id="end" type="date" className="h-9" value={c.endDate.slice(0, 10)} onChange={(e) => update({ endDate: `${e.target.value}T23:59:00` })} />
          </div>
        </div>
        {c.budget < 500 && <Helper className="text-destructive">Minimum budget is $500.</Helper>}
        {days <= 0 && <Helper className="text-destructive">End date must be after the start date.</Helper>}

        {mode === "advanced" ? (
          <div className="mt-5">
            <FieldLabel>Budget allocation across creator sets</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["automatic", "Automatic", "We split budget across creator sets using predicted performance and creator availability."],
                  ["manual", "Manual", "You set the maximum each creator set can spend."],
                ] as const
              ).map(([k, label, body]) => (
                <SelectableCard key={k} selected={c.allocation === k} onSelect={() => update({ allocation: k })} className="gap-1 p-3.5">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="pr-5 text-xs text-muted-foreground">{body}</span>
                </SelectableCard>
              ))}
            </div>
            <Helper>Reallocation only applies to uncommitted budget and future invitations. Accepted creator fees never change.</Helper>
          </div>
        ) : (
          <Helper>Budget is allocated automatically. Switch to Advanced to split it manually across creator sets.</Helper>
        )}
      </FormSection>
    </div>
  );
}
