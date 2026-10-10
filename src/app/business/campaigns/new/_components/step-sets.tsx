"use client";

import { useState } from "react";
import { Check, ChevronDown, Copy, FlaskConical, Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipToggle, Tag } from "@/components/chip";
import { PLATFORMS, PLATFORM_ORDER, PlatformIcon } from "@/components/platform-icon";
import { COUNTRY_FLAGS, COUNTRY_NAMES, compact, usd } from "@/lib/domain/format";
import { NICHES, NICHE_LABEL } from "@/lib/domain/labels";
import { matchSet } from "@/lib/domain/matching";
import type { CreatorSet, NicheId, Platform } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { FieldLabel, FormSection, Helper, MoneyInput } from "./form-section";
import { INTEREST_SUGGESTIONS, newSet, setBudget, type StepProps } from "./builder-state";

const COUNTRIES = ["US", "CA", "GB", "AU", "IE", "DE", "FR", "MX", "BR", "IN", "KR", "NG"];
const LANGUAGES = ["English", "Spanish", "Korean", "French", "Portuguese"];
const AGES = [13, 18, 25, 35, 45, 55, 65];

export function StepSets(props: StepProps) {
  const { draft, mode, setSets } = props;
  const [activeId, setActiveId] = useState<string | undefined>(draft.sets[0]?.id);
  const active = draft.sets.find((s) => s.id === activeId) ?? draft.sets[0];
  const patch = (id: string, p: Partial<CreatorSet>) => setSets((sets) => sets.map((s) => (s.id === id ? { ...s, ...p } : s)));

  if (mode === "guided") {
    const set = draft.sets[0];
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-dashed bg-card/60 p-4 text-sm text-muted-foreground">
          Tell us who you want to reach. We&apos;ll build one recommended creator set from these answers. Switch to <span className="font-medium text-foreground">Advanced</span> to create and compare multiple creator sets.
        </div>
        <SetEditor set={set} onChange={(p) => patch(set.id, p)} draft={draft} simple />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {draft.sets.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveId(s.id)}
            className={cn("inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium shadow-card", active?.id === s.id ? "border-primary ring-1 ring-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <span className="flex size-5 items-center justify-center rounded bg-muted text-[11px] tabular-nums">{String.fromCharCode(65 + i)}</span>
            <span className="max-w-48 truncate">{s.name}</span>
          </button>
        ))}
        <Button variant="outline" size="sm" className="h-9" onClick={() => { const s = newSet(draft.campaign.id, draft.sets.length); setSets((x) => [...x, s]); setActiveId(s.id); }}>
          <Plus /> Add creator set
        </Button>
      </div>
      {active && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FlaskConical className="size-3.5" /> Create sets for different audiences, niches, platforms or creative strategies, then compare results. Comparisons are observational, not controlled A/B tests.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { const copy = { ...active, id: `set-${Date.now().toString(36)}`, name: `${active.name} (copy)` }; setSets((x) => [...x, copy]); setActiveId(copy.id); }}>
                <Copy /> Duplicate
              </Button>
              <Button size="sm" variant="ghost" disabled={draft.sets.length === 1} onClick={() => { setSets((x) => x.filter((s) => s.id !== active.id)); setActiveId(draft.sets.find((s) => s.id !== active.id)?.id); }}>
                <Trash2 /> Remove
              </Button>
            </div>
          </div>
          <SetEditor key={active.id} set={active} onChange={(p) => patch(active.id, p)} draft={draft} />
        </>
      )}
    </div>
  );
}

function SetEditor({ set, onChange, draft, simple = false }: { set: CreatorSet; onChange: (p: Partial<CreatorSet>) => void; draft: StepProps["draft"]; simple?: boolean }) {
  const { matches } = matchSet(set, draft.campaign);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const [moreOpen, setMoreOpen] = useState(!simple);

  return (
    <div className="space-y-5">
      {!simple && (
        <FormSection title="Creator set">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sname">Name</FieldLabel>
              <Input id="sname" className="h-9" value={set.name} onChange={(e) => onChange({ name: e.target.value })} />
            </div>
            <div>
              <FieldLabel htmlFor="shyp" hint="Optional">What are you testing?</FieldLabel>
              <Input id="shyp" className="h-9" value={set.hypothesis} onChange={(e) => onChange({ hypothesis: e.target.value })} placeholder="e.g. Students respond to budget framing" />
            </div>
          </div>
        </FormSection>
      )}

      <FormSection title="Platforms" description="Creators post organically on these platforms." action={<span className="text-xs text-muted-foreground tabular-nums">{matches.length} creators qualify</span>}>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLATFORM_ORDER.map((p: Platform) => {
            const on = set.platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onChange({ platforms: toggle(set.platforms, p) })}
                className={cn("flex items-center gap-3 rounded-xl border bg-card p-3 text-left text-sm font-medium hover:border-foreground/20", on && "border-primary bg-brand-subtle/60 ring-1 ring-primary")}
              >
                <PlatformIcon platform={p} className="size-5" />
                <span className="flex-1">{PLATFORMS[p].label}</span>
                {p === "youtube" && <span className="text-[10px] font-normal text-muted-foreground">Beta</span>}
                {on && <Check className="size-4 text-primary" />}
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Target audience" description="Who should see the content. Organic reach follows each creator's real audience, so this guides selection rather than controlling delivery.">
        <div className="space-y-5">
          <div>
            <FieldLabel>Audience location</FieldLabel>
            <CountryPicker value={set.audienceGeo} onChange={(v) => onChange({ audienceGeo: v })} />
            <Helper>Creators qualify only if at least 40% of their audience is in these countries.</Helper>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <FieldLabel>Age</FieldLabel>
              <div className="flex items-center gap-2">
                <Select value={String(set.demographics.ageMin)} onValueChange={(v) => onChange({ demographics: { ...set.demographics, ageMin: Number(v) } })}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{AGES.slice(0, -1).map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
                <span className="text-muted-foreground">–</span>
                <Select value={String(set.demographics.ageMax)} onValueChange={(v) => onChange({ demographics: { ...set.demographics, ageMax: Number(v) } })}>
                  <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{[17, 24, 34, 44, 54, 64, 99].map((a) => <SelectItem key={a} value={String(a)}>{a === 99 ? "65+" : a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <FieldLabel>Gender</FieldLabel>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-0.5">
                {(["all", "women", "men"] as const).map((g) => (
                  <button key={g} type="button" onClick={() => onChange({ demographics: { ...set.demographics, gender: g } })} className={cn("h-8 rounded-md text-sm font-medium text-muted-foreground capitalize", set.demographics.gender === g && "bg-card text-foreground shadow-card")}>
                    {g === "all" ? "All" : g}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {!simple && (
            <div>
              <FieldLabel>Languages</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <ChipToggle key={l} pressed={set.demographics.languages.includes(l)} onPressedChange={() => onChange({ demographics: { ...set.demographics, languages: toggle(set.demographics.languages, l) } })}>
                    {l}
                  </ChipToggle>
                ))}
              </div>
            </div>
          )}
        </div>
      </FormSection>

      <FormSection title="Creators" description="Creator niche is what they make. Audience interests are what their viewers care about.">
        <div className="space-y-5">
          <div>
            <FieldLabel>Creator niche</FieldLabel>
            <NichePicker value={set.niches} onChange={(v) => onChange({ niches: v })} />
          </div>
          <div>
            <FieldLabel hint="Free text or pick suggestions">Audience interests</FieldLabel>
            <InterestInput value={set.interests} onChange={(v) => onChange({ interests: v })} suggestions={[...new Set(set.niches.flatMap((n) => INTEREST_SUGGESTIONS[n] ?? []))]} />
          </div>
          {!simple && (
            <div>
              <FieldLabel>Creator location</FieldLabel>
              <CountryPicker value={set.creatorGeo.countries} onChange={(v) => onChange({ creatorGeo: { ...set.creatorGeo, countries: v } })} placeholder="Anywhere" />
              <label className="mt-2 flex items-center gap-2 text-sm">
                <Switch checked={set.creatorGeo.required} onCheckedChange={(v) => onChange({ creatorGeo: { ...set.creatorGeo, required: v } })} disabled={!set.creatorGeo.countries.length} />
                Required (otherwise a preference)
              </label>
              <Helper>Separate from audience location: e.g. creators must live in the US to receive product shipments.</Helper>
            </div>
          )}
        </div>
      </FormSection>

      <section className="rounded-xl border bg-card">
        <button type="button" onClick={() => setMoreOpen((o) => !o)} className="flex w-full items-center justify-between p-6 text-left" aria-expanded={moreOpen}>
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Creator qualification {simple && <span className="font-normal text-muted-foreground">(optional)</span>}</h2>
            <p className="text-sm text-muted-foreground">≥{compact(set.qualification.minMedianViews)} median organic views · verified, genuine audience</p>
          </div>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", moreOpen && "rotate-180")} />
        </button>
        {moreOpen && (
          <div className="space-y-5 border-t p-6">
            <div>
              <div className="flex items-baseline justify-between">
                <FieldLabel>Minimum recent median views</FieldLabel>
                <span className="text-sm font-semibold tabular-nums">{compact(set.qualification.minMedianViews)}</span>
              </div>
              <Slider value={[set.qualification.minMedianViews]} min={0} max={100_000} step={5_000} onValueChange={([v]) => onChange({ qualification: { ...set.qualification, minMedianViews: v } })} aria-label="Minimum median views" />
              <Helper>Based on each creator&apos;s last 20 organic videos. We weigh consistency, audience match and cost efficiency too; engagement rate isn&apos;t used as a filter.</Helper>
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={!!set.qualification.followerRange} onCheckedChange={(v) => onChange({ qualification: { ...set.qualification, followerRange: v ? [10_000, 500_000] : undefined } })} />
                Filter by follower count
              </label>
              {set.qualification.followerRange && (
                <div className="mt-2 flex items-center gap-2">
                  <Input className="h-9 w-32" inputMode="numeric" value={set.qualification.followerRange[0]} onChange={(e) => onChange({ qualification: { ...set.qualification, followerRange: [Number(e.target.value.replace(/\D/g, "")) || 0, set.qualification.followerRange![1]] } })} aria-label="Minimum followers" />
                  <span className="text-muted-foreground">–</span>
                  <Input className="h-9 w-32" inputMode="numeric" value={set.qualification.followerRange[1]} onChange={(e) => onChange({ qualification: { ...set.qualification, followerRange: [set.qualification.followerRange![0], Number(e.target.value.replace(/\D/g, "")) || 0] } })} aria-label="Maximum followers" />
                </div>
              )}
              <Helper>Optional. Follower count alone doesn&apos;t predict views.</Helper>
            </div>
            {!simple && (
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <FieldLabel>Budget for this set</FieldLabel>
                  {draft.campaign.allocation === "manual" ? (
                    <MoneyInput value={set.budget ?? setBudget(draft, set)} onChange={(v) => onChange({ budget: v })} />
                  ) : (
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">{usd(setBudget(draft, set))}</span> <span className="text-muted-foreground">predicted (automatic)</span>
                    </p>
                  )}
                </div>
                <div>
                  <FieldLabel hint="Optional">Number of creators</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input className="h-9" inputMode="numeric" placeholder="Auto" value={set.creatorCount?.[0] ?? ""} onChange={(e) => onChange({ creatorCount: e.target.value ? [Number(e.target.value) || 1, set.creatorCount?.[1] ?? 12] : undefined })} aria-label="Minimum creators" />
                    <span className="text-muted-foreground">–</span>
                    <Input className="h-9" inputMode="numeric" placeholder="Auto" value={set.creatorCount?.[1] ?? ""} onChange={(e) => onChange({ creatorCount: e.target.value ? [set.creatorCount?.[0] ?? 1, Number(e.target.value) || 1] : undefined })} aria-label="Maximum creators" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function CountryPicker({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [q, setQ] = useState("");
  const results = COUNTRIES.filter((c) => (COUNTRY_NAMES[c] ?? c).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((c) => (
        <Tag key={c} onRemove={() => onChange(value.filter((x) => x !== c))}>
          {COUNTRY_FLAGS[c]} {COUNTRY_NAMES[c] ?? c}
        </Tag>
      ))}
      {value.length === 0 && placeholder && <span className="text-sm text-muted-foreground">{placeholder}</span>}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 border-dashed"><Plus /> Add country</Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-60 p-0">
          <div className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 text-muted-foreground" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search countries" className="h-10 w-full bg-transparent text-sm outline-none" />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {results.map((c) => (
              <button key={c} type="button" onClick={() => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                {COUNTRY_FLAGS[c]} <span className="flex-1 text-left">{COUNTRY_NAMES[c] ?? c}</span>
                {value.includes(c) && <Check className="size-4 text-primary" />}
              </button>
            ))}
          </div>
          <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Regions and cities where reliable audience data is available (coming soon)</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function NichePicker({ value, onChange }: { value: NicheId[]; onChange: (v: NicheId[]) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {value.map((n) => (
        <Tag key={n} onRemove={() => onChange(value.filter((x) => x !== n))}>{NICHE_LABEL[n]}</Tag>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 border-dashed"><Plus /> Add niche</Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-80 w-64 overflow-y-auto p-1">
          {NICHES.map((n) => (
            <button key={n.id} type="button" onClick={() => onChange(value.includes(n.id) ? value.filter((x) => x !== n.id) : [...value, n.id])} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <span className="flex-1 text-left">{n.label}</span>
              {value.includes(n.id) && <Check className="size-4 text-primary" />}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function InterestInput({ value, onChange, suggestions }: { value: string[]; onChange: (v: string[]) => void; suggestions: string[] }) {
  const [text, setText] = useState("");
  const add = (t: string) => {
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...new Set([...value, ...parts])]);
    setText("");
  };
  return (
    <div>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-lg border border-input px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        {value.map((i) => (
          <Tag key={i} onRemove={() => onChange(value.filter((x) => x !== i))} className="h-6">{i}</Tag>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(text);
            } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
          placeholder={value.length ? "" : "e.g. University students, running, protein snacks"}
          className="min-w-40 flex-1 bg-transparent px-1 text-sm outline-none"
          aria-label="Audience interests"
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {suggestions.filter((s) => !value.includes(s)).slice(0, 8).map((s) => (
          <button key={s} type="button" onClick={() => onChange([...value, s])} className="rounded-md px-2 py-0.5 text-xs font-medium text-primary hover:bg-brand-subtle">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}
