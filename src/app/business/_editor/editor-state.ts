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
  ai: ["LLM evals", "AI agents", "model benchmarks", "paper breakdowns", "RAG", "voice AI", "AI safety"],
  devtools: ["AI coding tools", "developer productivity", "code review", "API tutorials", "coding tutorials"],
  cloud: ["Kubernetes", "platform engineering", "DevOps", "observability", "cost optimization"],
  security: ["zero trust", "threat intel", "appsec", "security tooling"],
  data: ["data engineering", "SQL", "dashboards", "analytics engineering"],
  saas: ["enterprise software", "AI adoption", "B2B go-to-market"],
  fintech: ["payments APIs", "spend management", "startup finance"],
  product: ["AI product management", "product launches", "UX design", "design systems"],
  webdev: ["web development", "frontend", "web performance"],
  leadership: ["engineering management", "AI adoption", "developer productivity"],
  startups: ["founder diaries", "startup finance", "AI tools for teams"],
  careers: ["learning to code", "interview prep", "CS students", "tech careers"],
};

let n = 0;
/** Only call from event handlers (never during render). */
export const freshId = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

export function newSet(campaignId: string, index: number, id: string): CreatorSet {
  return {
    id,
    campaignId,
    name: index === 0 ? "New creator set" : `Creator set ${String.fromCharCode(65 + index)}`,
    hypothesis: "",
    platforms: ["youtube", "x"],
    audienceGeo: ["US"],
    creatorGeo: { countries: [], required: false },
    demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] },
    niches: ["ai", "devtools"],
    interests: ["AI agents", "AI coding tools", "voice AI"],
    qualification: { minMedianViews: 15_000 },
    price: 500,
    includeCreators: [],
    excludeCreators: [],
  };
}

/** Stable ids during render; real ids are assigned on save (see withFreshIds). */
export function newCampaignDraft(objective: Objective): EditorDraft {
  const id = "draft-campaign";
  const campaign: Campaign = {
    id,
    businessId: BUSINESS.id,
    businessName: BUSINESS.name,
    businessLogo: "K",
    businessColor: "bg-[oklch(0.45_0.12_260)]",
    source: "local",
    name: "Kestrel Voice Launch",
    objective,
    promoting: {
      kind: "product",
      name: "Kestrel Voice API",
      description: "Real-time speech-to-speech API with sub-300ms responses. Now in developer preview.",
      url: "https://kestrel.dev/voice",
      image: "t-mic",
    },
    status: "draft",
    budget: 3000,
    startDate: "2026-10-15T00:00:00",
    endDate: "2026-11-30T23:59:00",
    allocation: "automatic",
    brief: defaultBrief({
      benefits: ["Sub-300ms voice responses", "One WebSocket for speech in and out"],
      intendedAudience: "Developers building voice agents and assistants",
      talkingPoints: ["Build a tiny voice demo live", "Say how the latency feels in a real conversation"],
      mandatoryDemo: "Talk to your demo on camera, unedited",
      requiredMentions: ["@kestrelai", "#ad"],
      cta: { type: "signup", destination: "kestrel.dev/voice?ref=creators", measurement: "Developer preview signups via tracked link" },
      hooks: ["I built a voice agent in 30 minutes", "Testing a voice API for latency"],
    }),
    guarantee: { minViews: 0, platforms: ["youtube", "x"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
    createdAt: "2026-10-08T09:30:00",
  };
  const set = newSet(id, 0, "draft-set-0");
  return { campaign, sets: [{ ...set, name: "AI developers on YouTube & X" }] };
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
