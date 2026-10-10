import { matchSet, recommendRoster } from "@/lib/domain/matching";
import { defaultBrief, BUSINESS } from "@/lib/domain/seed";
import type { Activation, Campaign, CreatorSet, NicheId } from "@/lib/domain/types";
import { activationFromMatch } from "@/lib/store";

export type Mode = "guided" | "advanced";

export const STEPS = [
  { id: "basics", label: "Objective & basics" },
  { id: "sets", label: "Audience & creator sets" },
  { id: "brief", label: "Brief & creative" },
  { id: "matching", label: "Creator matching" },
  { id: "review", label: "Review & launch" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export interface Draft {
  campaign: Campaign;
  sets: CreatorSet[];
  activations: Activation[];
  /** Targeting signature each set's recommendations were generated from. */
  recSig: Record<string, string>;
}

export interface StepProps {
  draft: Draft;
  mode: Mode;
  setCampaign: (fn: (c: Campaign) => Campaign) => void;
  setSets: (fn: (s: CreatorSet[]) => CreatorSet[]) => void;
  setActivations: (fn: (a: Activation[]) => Activation[]) => void;
}

export const INTEREST_SUGGESTIONS: Partial<Record<NicheId, string[]>> = {
  beauty: ["skincare routines", "makeup", "GRWM", "sensitive skin", "lip care", "K-beauty", "budget skincare"],
  fitness: ["gym routines", "protein snacks", "home workouts", "running", "strength training"],
  food: ["healthy snacks", "meal prep", "15-minute recipes", "coffee"],
  education: ["university students", "college skincare", "study routines"],
  fashion: ["GRWM", "capsule wardrobe", "try-on hauls"],
  lifestyle: ["morning routines", "self-care", "travel", "home rituals"],
  tech: ["gadgets", "desk setups", "productivity"],
};

let n = 0;
const id = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

export function newSet(campaignId: string, index: number, base?: Partial<CreatorSet>, fixedId?: string): CreatorSet {
  return {
    id: fixedId ?? id("set"),
    campaignId,
    name: index === 0 ? "Recommended creators" : `Creator set ${String.fromCharCode(65 + index)}`,
    hypothesis: "",
    platforms: ["tiktok", "instagram"],
    audienceGeo: ["US"],
    creatorGeo: { countries: [], required: false },
    demographics: { ageMin: 18, ageMax: 34, gender: "women", languages: ["English"] },
    niches: ["beauty"],
    interests: ["lip care", "makeup", "GRWM"],
    qualification: { minMedianViews: 15_000 },
    ...base,
  };
}

/** Stable ids during render; real ids are assigned when the draft is saved. */
export function initialDraft(): Draft {
  const campaignId = "draft-campaign";
  const campaign: Campaign = {
    id: campaignId,
    businessId: BUSINESS.id,
    businessName: BUSINESS.name,
    businessLogo: "G",
    businessColor: "bg-[oklch(0.55_0.15_45)]",
    source: "local",
    name: "Glow Lip Oil Launch",
    objective: "awareness",
    promoting: {
      kind: "product",
      name: "Glow Tinted Lip Oil",
      description: "Non-sticky tinted lip oil with jojoba and vitamin E. Four shades.",
      url: "https://glowinc.co/lip-oil",
      image: "c-brushes",
    },
    status: "draft",
    budget: 3000,
    startDate: "2026-10-15T00:00:00",
    endDate: "2026-11-30T23:59:00",
    allocation: "automatic",
    brief: defaultBrief({
      benefits: ["Glossy tint without the stickiness", "Hydrates for hours"],
      intendedAudience: "Women 18–34 who want an easy everyday lip",
      talkingPoints: ["Swatch the shade on your lips", "Say how it feels after an hour"],
      mandatoryDemo: "Apply on camera in natural light",
      requiredMentions: ["@glowinc", "#GlowUp"],
      cta: { type: "promo_code", destination: "LIPGLOW · glowinc.co/lip-oil", measurement: "Promo code redemptions + UTM link in bio" },
      hooks: ["The lip oil that isn't sticky", "Testing a lip oil for 8 hours"],
    }),
    guarantee: { minViews: 0, platforms: ["tiktok", "instagram"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
    createdAt: "2026-10-08T09:30:00",
  };
  return { campaign, sets: [newSet(campaignId, 0, undefined, "draft-set-0")], activations: [], recSig: {} };
}

export function signature(set: CreatorSet, deliverables: number) {
  const { id: _id, name: _n, hypothesis: _h, budget: _b, ...rest } = set;
  return JSON.stringify({ ...rest, deliverables });
}

/** Budget available to each set: manual allocation, or an even split when automatic. */
export function setBudget(draft: Draft, set: CreatorSet) {
  return draft.campaign.allocation === "manual" && set.budget ? set.budget : Math.round(draft.campaign.budget / Math.max(1, draft.sets.length));
}

/** (Re)generate recommendations for any set whose targeting changed since last time. */
export function refreshRecommendations(draft: Draft): Draft {
  let activations = draft.activations;
  const recSig = { ...draft.recSig };
  for (const set of draft.sets) {
    const sig = signature(set, draft.campaign.brief.deliverables);
    if (recSig[set.id] === sig) continue;
    const otherSets = activations.filter((a) => a.setId !== set.id);
    const taken = otherSets.filter((a) => a.status !== "removed").map((a) => a.creatorId);
    const roster = recommendRoster(set, draft.campaign, setBudget(draft, set), taken);
    activations = [...otherSets, ...roster.map((m) => activationFromMatch(set, draft.campaign, m.creator.id)).filter((a): a is Activation => !!a)];
    recSig[set.id] = sig;
  }
  // Drop activations of deleted sets.
  activations = activations.filter((a) => draft.sets.some((s) => s.id === a.setId));
  return { ...draft, activations, recSig };
}

export function alternatives(draft: Draft, setId: string, count = 3): Activation[] {
  const set = draft.sets.find((s) => s.id === setId)!;
  const taken = new Set(draft.activations.map((a) => a.creatorId));
  return matchSet(set, draft.campaign)
    .matches.filter((m) => !taken.has(m.creator.id))
    .slice(0, count)
    .map((m) => activationFromMatch(set, draft.campaign, m.creator.id))
    .filter((a): a is Activation => !!a);
}

export function stepValid(step: StepId, d: Draft): boolean {
  const c = d.campaign;
  switch (step) {
    case "basics":
      return !!c.name.trim() && (c.promoting.kind === "brand" || !!c.promoting.name.trim()) && c.budget >= 500 && c.startDate < c.endDate;
    case "sets":
      return d.sets.length > 0 && d.sets.every((s) => s.platforms.length > 0 && s.niches.length > 0 && s.audienceGeo.length > 0 && s.name.trim());
    case "brief":
      return c.brief.deliverables > 0 && (c.brief.cta.type === "comment_keyword" || !!c.brief.cta.destination.trim());
    case "matching":
      return d.activations.some((a) => a.status === "approved");
    case "review":
      return false;
  }
}

/** Give a draft fresh ids before saving it to the store (call from an event handler). */
export function withFreshIds(d: Draft): Draft {
  const cid = id("c");
  const setIds = Object.fromEntries(d.sets.map((s) => [s.id, id("set")]));
  return {
    ...d,
    campaign: { ...d.campaign, id: cid },
    sets: d.sets.map((s) => ({ ...s, id: setIds[s.id], campaignId: cid })),
    activations: d.activations.map((a) => ({ ...a, campaignId: cid, setId: setIds[a.setId] ?? a.setId })),
  };
}
