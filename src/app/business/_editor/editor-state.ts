import { defaultBrief, BUSINESS } from "@/lib/domain/seed";
import type { Campaign, CreatorSet, NicheId, Objective } from "@/lib/domain/types";

export interface EditorDraft {
  campaign: Campaign;
  sets: CreatorSet[];
}

export type Node =
  | { type: "campaign" }
  | { type: "set"; id: string }
  | { type: "ad"; setId: string }
  | { type: "creator"; id: string };

export const nodeKey = (n: Node) => (n.type === "campaign" ? "campaign" : n.type === "set" ? `set:${n.id}` : n.type === "ad" ? `ad:${n.setId}` : `creator:${n.id}`);

export function parseNode(key: string | null): Node | null {
  if (!key) return null;
  const [type, id] = key.split(":");
  if (type === "campaign") return { type: "campaign" };
  if (type === "set" && id) return { type: "set", id };
  if (type === "ad" && id) return { type: "ad", setId: id };
  if (type === "creator" && id) return { type: "creator", id };
  return null;
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
/** Only call from event handlers (never during render). */
export const freshId = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

export function newSet(campaignId: string, index: number, selection: CreatorSet["selection"], id: string): CreatorSet {
  return {
    id,
    campaignId,
    name: index === 0 ? "New creator set" : `Creator set ${String.fromCharCode(65 + index)}`,
    hypothesis: "",
    platforms: ["tiktok", "instagram"],
    audienceGeo: ["US"],
    creatorGeo: { countries: [], required: false },
    demographics: { ageMin: 18, ageMax: 34, gender: "women", languages: ["English"] },
    niches: ["beauty"],
    interests: ["lip care", "makeup", "GRWM"],
    qualification: { minMedianViews: 15_000 },
    selection,
    includeCreators: [],
    excludeCreators: [],
  };
}

/** Stable ids during render; real ids are assigned on save (see withFreshIds). */
export function newCampaignDraft(objective: Objective, selection: CreatorSet["selection"]): EditorDraft {
  const id = "draft-campaign";
  const campaign: Campaign = {
    id,
    businessId: BUSINESS.id,
    businessName: BUSINESS.name,
    businessLogo: "G",
    businessColor: "bg-[oklch(0.55_0.15_45)]",
    source: "local",
    name: "Glow Lip Oil Launch",
    objective,
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
  const set = newSet(id, 0, selection, "draft-set-0");
  return { campaign, sets: [{ ...set, name: "Lip care fans on TikTok & Reels" }] };
}

export function withFreshIds(d: EditorDraft): EditorDraft {
  const cid = freshId("c");
  return {
    campaign: { ...d.campaign, id: cid },
    sets: d.sets.map((s) => ({ ...s, id: freshId("set"), campaignId: cid })),
  };
}

export function campaignErrors(c: Campaign) {
  const e: string[] = [];
  if (!c.name.trim()) e.push("Add a campaign name");
  if (c.promoting.kind !== "brand" && !c.promoting.name.trim()) e.push("Name what you're promoting");
  if (c.budget < 500) e.push("Budget must be at least $500");
  if (c.startDate >= c.endDate) e.push("End date must be after the start date");
  return e;
}

export function setErrors(s: CreatorSet) {
  const e: string[] = [];
  if (!s.name.trim()) e.push("Name this creator set");
  if (!s.platforms.length) e.push("Pick at least one platform");
  if (!s.audienceGeo.length) e.push("Add an audience location");
  if (!s.niches.length) e.push("Pick at least one creator niche");
  return e;
}

export function adErrors(c: Campaign, s: CreatorSet) {
  const b = s.brief ?? c.brief;
  const e: string[] = [];
  if (b.cta.type !== "comment_keyword" && !b.cta.destination.trim()) e.push("Add a CTA destination");
  if (!b.talkingPoints.length && !b.benefits.length) e.push("Add at least one talking point or benefit");
  return e;
}
