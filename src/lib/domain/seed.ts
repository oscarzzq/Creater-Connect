import { creatorById } from "./creators";
import { briefFor, guaranteeFloor, matchCreator, quote } from "./matching";
import type { Activation, ActivationStatus, Brief, Campaign, CreatorSet, Message, Post, PostMetrics, PostStatus } from "./types";

// Coherent mock world dated relative to the demo clock (2026-10-08).
// Fees, view estimates and match scores come from the pricing engine so every
// number reconciles across screens.

export const BUSINESS = {
  id: "b1",
  name: "Glow Inc.",
  tagline: "Clean skincare & wellness",
  website: "glowinc.co",
  user: { name: "Alex Rivera", email: "alex@glowinc.co", initials: "AR" },
};

const GLOW = { businessId: "b1", businessName: "Glow Inc.", businessLogo: "G", businessColor: "bg-[oklch(0.55_0.15_45)]", source: "demo" as const };

export function defaultBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    benefits: [],
    intendedAudience: "",
    format: "short_video",
    deliverables: 1,
    videoLength: "30–45s",
    tone: "Authentic and personal. Show it in your real routine, no hard sell.",
    talkingPoints: [],
    mandatoryDemo: "",
    requiredMentions: [],
    prohibited: ["Medical or guaranteed-results claims", "Competitor products in frame"],
    references: [],
    cta: { type: "link_in_bio", destination: "", measurement: "UTM link in bio" },
    hooks: [],
    script: { mode: "freedom", text: "" },
    review: { required: true, revisionRounds: 1, turnaroundDays: 2 },
    rights: { paidUsage: false, months: 0, channels: "" },
    fulfillment: { kind: "ship", details: "Product shipped within 2 business days of acceptance." },
    ...overrides,
  };
}

const glowBrief = (o: Partial<Brief>) =>
  defaultBrief({
    requiredMentions: ["@glowinc", "#GlowUp"],
    prohibited: ["Medical claims (e.g. 'cures acne')", "Competitor products in frame", "Filters that alter skin texture"],
    ...o,
  });

// ---------------------------------------------------------------------------
// Builders

const campaigns: Campaign[] = [];
const sets: CreatorSet[] = [];
const activations: Activation[] = [];
const posts: Post[] = [];

function addSet(
  s: Omit<CreatorSet, "creatorGeo" | "qualification" | "selection" | "includeCreators" | "excludeCreators"> &
    Partial<Pick<CreatorSet, "creatorGeo" | "qualification" | "selection" | "includeCreators" | "excludeCreators">>
) {
  const full: CreatorSet = {
    creatorGeo: { countries: [], required: false },
    qualification: { minMedianViews: 10_000 },
    selection: "automatic",
    includeCreators: [],
    excludeCreators: [],
    ...s,
  };
  sets.push(full);
  return full;
}

type ActSeed = {
  id: string;
  set: CreatorSet;
  creatorId: string;
  status: ActivationStatus;
  invited?: string;
  responded?: string;
  declineReason?: string;
  replacementFor?: string;
  supplementary?: boolean;
  fulfillment?: Activation["fulfillment"];
  messages?: Message[];
};

function addActivation(a: ActSeed) {
  const campaign = campaigns.find((c) => c.id === a.set.campaignId)!;
  const creator = creatorById(a.creatorId)!;
  const q = quote(creator, a.set.platforms, briefFor(campaign, a.set).deliverables)!;
  const m = matchCreator(creator, a.set, campaign);
  const invited = a.invited;
  const act: Activation = {
    id: a.id,
    campaignId: campaign.id,
    setId: a.set.id,
    creatorId: a.creatorId,
    platform: q.platform,
    status: a.status,
    fee: q.fee,
    estViews: q.estViews,
    matchScore: m.score,
    approvedAt: invited ?? (a.status === "approved" ? campaign.createdAt : undefined),
    invitedAt: invited,
    respondedAt: a.responded,
    expiresAt: invited ? plusDays(invited, 7) : undefined,
    declineReason: a.declineReason,
    replacementFor: a.replacementFor,
    supplementary: a.supplementary,
    fulfillment: a.fulfillment ?? (a.status === "accepted" ? (campaign.brief.fulfillment.kind === "none" ? "not_needed" : "delivered") : "not_needed"),
    messages: a.messages ?? [],
  };
  activations.push(act);
  return act;
}

type PostSeed = {
  status: PostStatus;
  thumb: string;
  caption?: string;
  due: string;
  submitted?: string;
  approved?: string;
  published?: string;
  version?: number;
  revisionNote?: string;
  /** Actual views as a multiple of the expected views per post. */
  perf?: number;
  hook?: string;
};

function addPosts(act: Activation, seeds: PostSeed[]) {
  const campaign = campaigns.find((c) => c.id === act.campaignId)!;
  const perPost = act.estViews[1] / campaign.brief.deliverables;
  seeds.forEach((s, i) => {
    const live = s.status === "published" || s.status === "verified";
    posts.push({
      id: `${act.id}-p${i + 1}`,
      activationId: act.id,
      campaignId: act.campaignId,
      setId: act.setId,
      creatorId: act.creatorId,
      platform: act.platform,
      index: i + 1,
      status: s.status,
      thumbnail: s.thumb,
      caption: s.caption ?? "",
      duration: 38 - i * 4,
      hook: s.hook,
      dueAt: s.due,
      submittedAt: s.submitted,
      approvedAt: s.approved,
      publishedAt: s.published,
      verifiedAt: s.status === "verified" && s.published ? plusDays(s.published, 2) : undefined,
      url: live ? `https://${act.platform === "tiktok" ? "tiktok.com/@" : act.platform === "instagram" ? "instagram.com/reel/" : "youtube.com/shorts/"}${act.creatorId}${i}` : undefined,
      version: s.version ?? 1,
      revisionNote: s.revisionNote,
      metrics: live ? metrics(Math.round(perPost * (s.perf ?? 1)), campaign.objective, `${act.id}${i}`) : undefined,
    });
  });
}

function metrics(views: number, objective: Campaign["objective"], seed: string): PostMetrics {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const j = 0.85 + (h % 30) / 100;
  const clicks = Math.round(views * (objective === "traffic" ? 0.018 : objective === "sales" ? 0.012 : 0.006) * j);
  const conversions = objective === "sales" ? Math.round(clicks * 0.035) : objective === "leads" ? Math.round(clicks * 0.08) : 0;
  return {
    views,
    likes: Math.round(views * 0.062 * j),
    comments: Math.round(views * 0.0042 * j),
    shares: Math.round(views * 0.0051 * j),
    clicks,
    conversions,
    conversionValue: conversions * 34,
  };
}

function plusDays(iso: string, days: number) {
  const d = new Date(new Date(iso).getTime() + days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

const msg = (id: string, from: Message["from"], text: string, at: string): Message => ({ id, from, text, at });

function lowSum(campaignId: string, statuses: ActivationStatus[] = ["accepted", "invited"]) {
  return activations.filter((a) => a.campaignId === campaignId && statuses.includes(a.status) && !a.supplementary).map((a) => a.estViews[0]);
}

// ---------------------------------------------------------------------------
// Glow Serum Launch — live, two creator sets being compared

campaigns.push({
  ...GLOW,
  id: "camp1",
  name: "Glow Serum Launch",
  objective: "awareness",
  promoting: {
    kind: "product",
    name: "Vitamin C Brightening Serum",
    description: "Lightweight daily serum with 15% vitamin C for visibly brighter skin in 14 days. Fragrance-free, safe for sensitive skin.",
    url: "https://glowinc.co/serum",
    image: "c-serum-eucalyptus",
  },
  status: "active",
  budget: 6000,
  startDate: "2026-09-22T00:00:00",
  endDate: "2026-11-14T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    benefits: ["Visibly brighter skin in 14 days", "Lightweight, non-sticky texture", "Fragrance-free, safe for sensitive skin"],
    intendedAudience: "Women 18–34 who want a simple, effective morning routine",
    talkingPoints: ["Show where it fits in your real morning routine", "Talk about texture and how your skin feels", "Share your honest first impression"],
    mandatoryDemo: "Apply 2–3 drops on camera and show the texture up close",
    requiredMentions: ["@glowinc", "#GlowUp", "Code GLOW15"],
    cta: { type: "promo_code", destination: "GLOW15 · glowinc.co/serum", measurement: "Promo code redemptions + UTM link in bio" },
    hooks: ["I tried a vitamin C serum for 14 days…", "The first serum that didn't sting my sensitive skin", "Dorm-room skincare that actually works"],
    script: { mode: "required_statements", text: "Include: “Use code GLOW15 for 15% off.”" },
  }),
  guarantee: { minViews: 0, platforms: ["tiktok", "instagram"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-09-18T11:00:00",
  launchedAt: "2026-09-22T10:00:00",
});

const s1a = addSet({
  id: "set1a", campaignId: "camp1", name: "A · Skincare routines on TikTok",
  hypothesis: "Routine-led skincare creators deliver the cheapest qualified views.",
  platforms: ["tiktok"], audienceGeo: ["US", "CA"], creatorGeo: { countries: ["US", "CA"], required: false },
  demographics: { ageMin: 18, ageMax: 34, gender: "women", languages: ["English"] },
  niches: ["beauty"], interests: ["skincare routines", "serums", "sensitive skin", "morning routines"],
  qualification: { minMedianViews: 20_000 },
  selection: "manual",
});
const s1b = addSet({
  id: "set1b", campaignId: "camp1", name: "B · Student skincare on Reels",
  hypothesis: "Students respond to budget-friendly ‘dorm routine’ framing.",
  platforms: ["instagram"], audienceGeo: ["US"], creatorGeo: { countries: ["US"], required: true },
  demographics: { ageMin: 18, ageMax: 24, gender: "women", languages: ["English"] },
  niches: ["beauty", "education", "fashion"], interests: ["university students", "college skincare", "budget skincare", "GRWM"],
  qualification: { minMedianViews: 8_000 },
});

const a1 = addActivation({ id: "act1", set: s1a, creatorId: "c1", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-22T12:10:00" });
addPosts(a1, [{ status: "verified", thumb: "p-maya", caption: "My 2-minute morning routine with @glowinc Vitamin C serum ✨ #GlowUp", due: "2026-10-10T23:59:00", submitted: "2026-09-29T18:00:00", approved: "2026-09-30T10:00:00", published: "2026-10-02T14:00:00", perf: 1.24, hook: "I tried a vitamin C serum for 14 days…" }]);
const a2 = addActivation({ id: "act2", set: s1a, creatorId: "c9", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-22T14:30:00" });
addPosts(a2, [{ status: "verified", thumb: "c-serum-white", caption: "Testing @glowinc's vitamin C serum for 14 days: honest review", due: "2026-10-10T23:59:00", submitted: "2026-10-01T09:00:00", approved: "2026-10-02T11:00:00", published: "2026-10-05T17:00:00", perf: 0.96 }]);
const a3 = addActivation({ id: "act3", set: s1a, creatorId: "c10", status: "accepted", invited: "2026-09-25T11:00:00", responded: "2026-09-25T13:05:00" });
addPosts(a3, [{ status: "approved", thumb: "c-serum-stones", caption: "Brightening routine for melanin-rich skin ft. @glowinc", due: "2026-10-10T23:59:00", submitted: "2026-10-06T10:00:00", approved: "2026-10-07T09:30:00" }]);
const a4 = addActivation({ id: "act4", set: s1a, creatorId: "c12", status: "accepted", invited: "2026-10-01T10:00:00", responded: "2026-10-03T09:00:00" });
addPosts(a4, [{ status: "draft_submitted", thumb: "p-ella", caption: "POV: you finally found a serum that doesn't sting", due: "2026-10-17T23:59:00", submitted: "2026-10-07T19:00:00", hook: "The first serum that didn't sting my sensitive skin" }]);
addActivation({
  id: "act5", set: s1a, creatorId: "c14", status: "invited", invited: "2026-10-06T10:00:00",
  messages: [msg("m1", "creator", "Hi! Could I film this as part of my PM routine instead? My audience watches my night routines more.", "2026-10-07T21:10:00")],
});
addActivation({ id: "act6", set: s1a, creatorId: "c17", status: "replacement_required", invited: "2026-09-25T11:00:00", responded: "2026-10-05T08:00:00", declineReason: "Fully booked through November." });
addActivation({ id: "act7", set: s1a, creatorId: "c11", status: "recommended", replacementFor: "act6" });

const b1 = addActivation({ id: "act8", set: s1b, creatorId: "c15", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-23T09:00:00" });
addPosts(b1, [{ status: "published", thumb: "p-zoe", caption: "Dorm-room skincare that's actually affordable 🧴", due: "2026-10-10T23:59:00", submitted: "2026-10-04T12:00:00", approved: "2026-10-05T10:00:00", published: "2026-10-07T18:00:00", perf: 0.62, hook: "Dorm-room skincare that actually works" }]);
const b2 = addActivation({ id: "act9", set: s1b, creatorId: "c7", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-23T16:20:00" });
addPosts(b2, [{ status: "revision_requested", thumb: "p-nora", caption: "GRWM: dewy skin prep with @glowinc serum", due: "2026-10-14T23:59:00", submitted: "2026-10-03T12:00:00", version: 2, revisionNote: "Love the vibe! Please show the serum texture close-up in the first 3 seconds and say the GLOW15 code out loud." }]);
const b3 = addActivation({
  id: "act10", set: s1b, creatorId: "c18", status: "accepted", invited: "2026-09-29T10:00:00", responded: "2026-09-30T08:00:00", fulfillment: "shipped",
  messages: [msg("m2", "creator", "Accepted! Shipping address is updated in my profile.", "2026-09-30T08:05:00"), msg("m3", "business", "Thanks Jess, it shipped today via USPS.", "2026-10-02T11:00:00")],
});
addPosts(b3, [{ status: "not_started", thumb: "c-mask", due: "2026-10-20T23:59:00" }]);
addActivation({ id: "act11", set: s1b, creatorId: "c16", status: "invited", invited: "2026-10-07T15:00:00" });

campaigns[0].guarantee!.minViews = guaranteeFloor(lowSum("camp1"));

// ---------------------------------------------------------------------------
// Protein Bites Try-On — inviting creators, sales objective

campaigns.push({
  ...GLOW,
  id: "camp2",
  name: "Protein Bites Try-On",
  objective: "sales",
  promoting: { kind: "product", name: "Glow Protein Bites", description: "12g protein, 4g sugar bites in cocoa and peanut butter.", url: "https://glowinc.co/bites", image: "c-protein-bars" },
  status: "active",
  budget: 2000,
  startDate: "2026-10-01T00:00:00",
  endDate: "2026-10-31T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    benefits: ["12g protein, 4g sugar", "Actually tastes like dessert"],
    intendedAudience: "Gym-goers and busy snackers 18–34",
    videoLength: "20–30s",
    talkingPoints: ["Open with your first bite", "Say what you'd normally snack on instead"],
    mandatoryDemo: "Eat one on camera and react honestly",
    requiredMentions: ["@glowinc", "Code GLOWBITES"],
    cta: { type: "promo_code", destination: "GLOWBITES · glowinc.co/bites", measurement: "Promo code purchases (attributed)" },
    hooks: ["Rating the protein snack everyone's asking about", "4g of sugar and it tastes like THIS?"],
  }),
  guarantee: { minViews: 0, platforms: ["tiktok"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-09-29T15:00:00",
  launchedAt: "2026-10-01T09:30:00",
});
const s2 = addSet({
  id: "set2", campaignId: "camp2", name: "Gym & snack creators on TikTok",
  hypothesis: "", platforms: ["tiktok"], audienceGeo: ["US"], creatorGeo: { countries: ["US"], required: true },
  demographics: { ageMin: 18, ageMax: 34, gender: "all", languages: ["English"] },
  niches: ["fitness", "food"], interests: ["protein snacks", "gym routines", "healthy snacks", "meal prep"],
  qualification: { minMedianViews: 15_000 },
});
addActivation({ id: "act20", set: s2, creatorId: "c2", status: "invited", invited: "2026-10-05T09:30:00" });
const a21 = addActivation({ id: "act21", set: s2, creatorId: "c19", status: "accepted", invited: "2026-10-01T09:30:00", responded: "2026-10-04T08:45:00", fulfillment: "shipped" });
addPosts(a21, [{ status: "not_started", thumb: "c-protein-bars", due: "2026-10-20T23:59:00" }]);
addActivation({ id: "act22", set: s2, creatorId: "c20", status: "invited", invited: "2026-10-07T11:20:00" });
addActivation({ id: "act23", set: s2, creatorId: "c5", status: "declined", invited: "2026-10-01T09:30:00", responded: "2026-10-03T12:00:00", declineReason: "Not taking snack sponsorships this month." });
// Automatic selection: the replacement was invited without waiting for approval.
addActivation({ id: "act24", set: s2, creatorId: "c26", status: "invited", invited: "2026-10-03T12:05:00", replacementFor: "act23" });
campaigns[1].guarantee!.minViews = guaranteeFloor(lowSum("camp2"));

// ---------------------------------------------------------------------------
// Holiday Gift Set — awaiting content review, 2 posts per creator, paid usage add-on

campaigns.push({
  ...GLOW,
  id: "camp4",
  name: "Holiday Gift Set",
  objective: "traffic",
  promoting: { kind: "product", name: "Holiday Glow Ritual Set", description: "Serum, cream and gua sha in a gift box.", url: "https://glowinc.co/holiday", image: "c-jars" },
  status: "active",
  budget: 3500,
  startDate: "2026-09-15T00:00:00",
  endDate: "2026-10-31T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    deliverables: 2,
    benefits: ["Everything for a 3-step ritual", "Gift-ready packaging"],
    intendedAudience: "Gift shoppers 25–44",
    talkingPoints: ["Post 1: unboxing and first impressions", "Post 2: your ritual one week in"],
    mandatoryDemo: "Show the ribbon reveal and all three products",
    cta: { type: "tracked_link", destination: "glowinc.co/holiday?utm_source=creators", measurement: "Tracked link clicks (UTM)" },
    hooks: ["The gift I'm giving everyone this year", "Unboxing the prettiest skincare set"],
    rights: { paidUsage: true, months: 3, channels: "Glow Inc. paid social (Meta, TikTok)" },
  }),
  guarantee: { minViews: 0, platforms: ["tiktok", "instagram"], windowDays: 30, verification: "Platform API, organic views only", remedy: "credit" },
  createdAt: "2026-09-10T09:00:00",
  launchedAt: "2026-09-15T10:00:00",
});
const s4 = addSet({
  id: "set4", campaignId: "camp4", name: "Gifting & unboxing creators",
  hypothesis: "", platforms: ["tiktok", "instagram"], audienceGeo: ["US", "CA"],
  demographics: { ageMin: 18, ageMax: 44, gender: "women", languages: ["English"] },
  niches: ["beauty", "fashion", "lifestyle"], interests: ["unboxings", "gifting", "GRWM", "self-care"],
  qualification: { minMedianViews: 20_000 },
});
const h1 = addActivation({ id: "act30", set: s4, creatorId: "c16", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-18T09:00:00" });
addPosts(h1, [
  { status: "draft_submitted", thumb: "p-mia", caption: "Unboxing the Holiday Glow Ritual Set 🎁", due: "2026-10-12T23:59:00", submitted: "2026-10-07T15:00:00", hook: "Unboxing the prettiest skincare set" },
  { status: "not_started", thumb: "c-flatlay", due: "2026-10-26T23:59:00" },
]);
const h2 = addActivation({ id: "act31", set: s4, creatorId: "c14", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-19T17:30:00" });
addPosts(h2, [
  { status: "draft_submitted", thumb: "c-serum-shadow", caption: "Slow unboxing + texture shots", due: "2026-10-12T23:59:00", submitted: "2026-10-07T14:00:00" },
  { status: "not_started", thumb: "c-bottles", due: "2026-10-26T23:59:00" },
]);
const h3 = addActivation({ id: "act32", set: s4, creatorId: "c3", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-18T12:00:00" });
addPosts(h3, [
  { status: "revision_requested", thumb: "c-soaps", caption: "Gift wrapping + reveal", due: "2026-10-12T23:59:00", submitted: "2026-10-02T11:00:00", version: 2, revisionNote: "Please re-shoot the unboxing in natural light. The ribbon reveal is great, keep that." },
  { status: "not_started", thumb: "c-coffee", due: "2026-10-26T23:59:00" },
]);
const h4 = addActivation({ id: "act33", set: s4, creatorId: "c11", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-17T08:30:00" });
addPosts(h4, [
  { status: "approved", thumb: "c-amber", caption: "The gift I'm giving everyone this year", due: "2026-10-12T23:59:00", submitted: "2026-09-29T10:00:00", approved: "2026-09-30T10:00:00" },
  { status: "draft_submitted", thumb: "c-brushes", caption: "One week into my holiday ritual", due: "2026-10-26T23:59:00", submitted: "2026-10-08T08:00:00" },
]);
campaigns[2].guarantee!.minViews = guaranteeFloor(lowSum("camp4"));

// ---------------------------------------------------------------------------
// Daily Shield SPF 50 — completed, guarantee exceeded

campaigns.push({
  ...GLOW,
  id: "camp3",
  name: "Daily Shield SPF 50",
  objective: "awareness",
  promoting: { kind: "product", name: "Daily Shield SPF 50", description: "Invisible daily sunscreen, no white cast.", url: "https://glowinc.co/spf", image: "c-tube" },
  status: "completed",
  budget: 3000,
  startDate: "2026-07-28T00:00:00",
  endDate: "2026-09-12T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    benefits: ["No white cast", "Works under makeup"],
    intendedAudience: "Women 18–44",
    talkingPoints: ["Show it in your morning routine", "Show it under makeup"],
    mandatoryDemo: "Rub in on camera to show no white cast",
    cta: { type: "link_in_bio", destination: "glowinc.co/spf", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["tiktok", "instagram"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-07-21T10:00:00",
  launchedAt: "2026-07-28T10:00:00",
});
const s3 = addSet({
  id: "set3", campaignId: "camp3", name: "Summer skincare creators",
  hypothesis: "", platforms: ["tiktok", "instagram"], audienceGeo: ["US", "CA"],
  demographics: { ageMin: 18, ageMax: 44, gender: "women", languages: ["English"] },
  niches: ["beauty", "lifestyle"], interests: ["skincare routines", "self-care", "morning routines"],
  qualification: { minMedianViews: 20_000 },
});
(
  [
    ["act40", "c1", "c-tube", "SPF that actually disappears ☀️", "2026-08-20T15:00:00", 1.42],
    ["act41", "c3", "c-beach", "Beach-day skincare, the easy way", "2026-08-25T15:00:00", 1.31],
    ["act42", "c11", "c-pump", "SPF under makeup, no pilling", "2026-08-29T15:00:00", 1.08],
    ["act43", "c9", "c-jars", "Dermatologist-approved SPF routine", "2026-09-02T15:00:00", 1.12],
    ["act44", "c12", "p-ella", "Me pretending I always wore SPF", "2026-09-05T15:00:00", 1.35],
  ] as const
).forEach(([id, creatorId, thumb, caption, published, perf]) => {
  const act = addActivation({ id, set: s3, creatorId, status: "accepted", invited: "2026-07-28T10:00:00", responded: "2026-07-29T10:00:00" });
  addPosts(act, [{ status: "verified", thumb, caption, due: "2026-09-10T23:59:00", submitted: plusDays(published, -3), approved: plusDays(published, -2), published, perf }]);
});
campaigns[3].guarantee!.minViews = guaranteeFloor(lowSum("camp3", ["accepted"]));

// ---------------------------------------------------------------------------
// Hydra Mist — underdelivered, make-good in progress

campaigns.push({
  ...GLOW,
  id: "camp5",
  name: "Hydra Mist Spray",
  objective: "awareness",
  promoting: { kind: "product", name: "Hydra Mist Facial Spray", description: "Hyaluronic mist for midday hydration.", url: "https://glowinc.co/mist", image: "c-amber" },
  status: "make_good",
  budget: 2500,
  startDate: "2026-08-10T00:00:00",
  endDate: "2026-09-20T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    benefits: ["Instant hydration", "Sets makeup"],
    talkingPoints: ["Show a midday refresh"],
    cta: { type: "link_in_bio", destination: "glowinc.co/mist", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["tiktok"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  makeGood: {
    reason: "Verified views fell short of the guarantee when the 30-day window closed on Oct 5.",
    remedy: "2 supplementary creators added at our expense. Their views count toward your guarantee.",
    addedAt: "2026-10-06T10:00:00",
  },
  createdAt: "2026-08-04T10:00:00",
  launchedAt: "2026-08-10T10:00:00",
});
const s5 = addSet({
  id: "set5", campaignId: "camp5", name: "Everyday hydration on TikTok",
  hypothesis: "", platforms: ["tiktok"], audienceGeo: ["US"],
  demographics: { ageMin: 18, ageMax: 34, gender: "women", languages: ["English"] },
  niches: ["beauty"], interests: ["skincare routines", "makeup"],
  qualification: { minMedianViews: 20_000 },
});
(
  [
    ["act50", "c14", "c-serum-shadow", "Midday refresh routine", "2026-08-20T15:00:00", 0.4],
    ["act51", "c18", "c-pump", "Drugstore vs luxury mist test", "2026-08-28T15:00:00", 0.36],
    ["act52", "c10", "c-facial", "Hydration hack for dry skin", "2026-09-05T15:00:00", 0.38],
  ] as const
).forEach(([id, creatorId, thumb, caption, published, perf]) => {
  const act = addActivation({ id, set: s5, creatorId, status: "accepted", invited: "2026-08-10T10:00:00", responded: "2026-08-11T10:00:00" });
  addPosts(act, [{ status: "verified", thumb, caption, due: "2026-09-10T23:59:00", submitted: plusDays(published, -3), approved: plusDays(published, -2), published, perf }]);
});
campaigns[4].guarantee!.minViews = guaranteeFloor(lowSum("camp5", ["accepted"]));
const mg1 = addActivation({ id: "act53", set: s5, creatorId: "c15", status: "accepted", invited: "2026-10-06T10:00:00", responded: "2026-10-06T15:00:00", supplementary: true });
addPosts(mg1, [{ status: "approved", thumb: "c-serum-white", caption: "My 3pm skin reset", due: "2026-10-14T23:59:00", submitted: "2026-10-07T10:00:00", approved: "2026-10-08T09:00:00" }]);
const mg2 = addActivation({ id: "act54", set: s5, creatorId: "c12", status: "accepted", invited: "2026-10-06T10:00:00", responded: "2026-10-07T09:00:00", supplementary: true });
addPosts(mg2, [{ status: "not_started", thumb: "c-mask", due: "2026-10-20T23:59:00" }]);

// ---------------------------------------------------------------------------
// Night Repair Cream — draft, recommendations ready for review

campaigns.push({
  ...GLOW,
  id: "camp6",
  name: "Night Repair Cream",
  objective: "awareness",
  promoting: { kind: "product", name: "Night Repair Cream", description: "Overnight ceramide cream.", url: "https://glowinc.co/night", image: "c-serum-shadow" },
  status: "draft",
  budget: 4000,
  startDate: "2026-11-01T00:00:00",
  endDate: "2026-12-15T23:59:00",
  allocation: "automatic",
  brief: glowBrief({
    benefits: ["Wake up to calmer skin"],
    talkingPoints: ["Show your PM routine"],
    cta: { type: "link_in_bio", destination: "glowinc.co/night", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["tiktok"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-10-07T16:00:00",
});
addSet({
  id: "set6a", campaignId: "camp6", name: "A · Night routines (women 25–44)",
  hypothesis: "Night-routine creators reach the core buyer.",
  platforms: ["tiktok"], audienceGeo: ["US", "CA"],
  demographics: { ageMin: 25, ageMax: 44, gender: "women", languages: ["English"] },
  niches: ["beauty"], interests: ["skincare routines", "sensitive skin", "K-beauty"],
  qualification: { minMedianViews: 20_000 },
});
addSet({
  id: "set6b", campaignId: "camp6", name: "B · Men's skincare",
  hypothesis: "Men's skincare creators open a new audience at lower cost.",
  platforms: ["tiktok"], audienceGeo: ["US"],
  demographics: { ageMin: 18, ageMax: 34, gender: "men", languages: ["English"] },
  niches: ["beauty", "fitness"], interests: ["men's skincare", "gym routines"],
  qualification: { minMedianViews: 20_000 },
});
// Drafts have no roster yet: matching runs when the campaign is published.

// ---------------------------------------------------------------------------
// Other brands (creator inbox)

function otherBrand(id: string, businessId: string, businessName: string, logo: string, color: string, name: string, product: string, image: string, brief: Partial<Brief>, end: string) {
  campaigns.push({
    id, businessId, businessName, businessLogo: logo, businessColor: color, source: "demo", name, objective: "awareness",
    promoting: { kind: "product", name: product, description: "", url: "", image }, status: "active", budget: 8000,
    startDate: "2026-10-01T00:00:00", endDate: end, allocation: "automatic", brief: defaultBrief(brief), createdAt: "2026-09-30T10:00:00", launchedAt: "2026-10-01T10:00:00",
  });
}

otherBrand("camp7", "b2", "Lumen Skin", "L", "bg-[oklch(0.45_0.08_250)]", "Retinol Night Ritual", "Gentle Retinol 0.3%", "c-serum-blue",
  { talkingPoints: ["Show the pea-sized amount", "Explain you start twice a week"], prohibited: ["No before/after claims"], cta: { type: "link_in_bio", destination: "lumenskin.com", measurement: "UTM link in bio" }, requiredMentions: ["@lumenskin"] }, "2026-11-20T23:59:00");
const s7 = addSet({ id: "set7", campaignId: "camp7", name: "Evening routines", hypothesis: "", platforms: ["tiktok"], audienceGeo: ["US", "CA"], demographics: { ageMin: 18, ageMax: 44, gender: "women", languages: ["English"] }, niches: ["beauty"], interests: ["skincare routines"], qualification: { minMedianViews: 20_000 } });
addActivation({ id: "act80", set: s7, creatorId: "c1", status: "invited", invited: "2026-10-07T10:00:00" });
addActivation({ id: "act81", set: s7, creatorId: "c9", status: "invited", invited: "2026-10-07T10:00:00" });

otherBrand("camp8", "b3", "Kinfolk Coffee", "K", "bg-[oklch(0.42_0.06_60)]", "Morning Ritual Series", "Single-Origin Cold Brew", "c-coffee",
  { fulfillment: { kind: "ship", details: "Two cans shipped on acceptance." }, talkingPoints: ["Pour shot in the first 3 seconds"], cta: { type: "promo_code", destination: "KINFOLK20", measurement: "Promo code" }, review: { required: false, revisionRounds: 0, turnaroundDays: 0 } }, "2026-10-30T23:59:00");
const s8 = addSet({ id: "set8", campaignId: "camp8", name: "Slow mornings", hypothesis: "", platforms: ["instagram"], audienceGeo: ["US"], demographics: { ageMin: 18, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["lifestyle", "food"], interests: ["morning routines"], qualification: { minMedianViews: 10_000 } });
addActivation({ id: "act82", set: s8, creatorId: "c1", status: "invited", invited: "2026-10-08T08:15:00" });
const k2 = addActivation({ id: "act83", set: s8, creatorId: "c3", status: "accepted", invited: "2026-10-02T10:00:00", responded: "2026-10-03T10:00:00", fulfillment: "delivered" });
addPosts(k2, [{ status: "not_started", thumb: "c-coffee", due: "2026-10-30T23:59:00" }]);

otherBrand("camp9", "b4", "Arc Athletics", "A", "bg-[oklch(0.3_0.02_275)]", "Fall Strength Challenge", "Arc Resistance Bands", "c-gym",
  { talkingPoints: ["Show 3 moves"], cta: { type: "tracked_link", destination: "arcathletics.com/fall", measurement: "Tracked link" } }, "2026-11-05T23:59:00");
const s9 = addSet({ id: "set9", campaignId: "camp9", name: "Strength creators", hypothesis: "", platforms: ["tiktok"], audienceGeo: ["US"], demographics: { ageMin: 18, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["fitness"], interests: ["gym routines"], qualification: { minMedianViews: 15_000 } });
addActivation({ id: "act84", set: s9, creatorId: "c2", status: "invited", invited: "2026-10-06T10:00:00" });

otherBrand("camp10", "b5", "Bloom Hair", "B", "bg-[oklch(0.55_0.12_350)]", "Scalp Serum Launch", "Bloom Scalp Serum", "c-amber", {}, "2026-10-20T23:59:00");
const s10 = addSet({ id: "set10", campaignId: "camp10", name: "Haircare routines", hypothesis: "", platforms: ["tiktok"], audienceGeo: ["US"], demographics: { ageMin: 18, ageMax: 44, gender: "women", languages: ["English"] }, niches: ["beauty"], interests: [], qualification: { minMedianViews: 20_000 } });
addActivation({ id: "act85", set: s10, creatorId: "c1", status: "declined", invited: "2026-09-20T10:00:00", responded: "2026-09-21T10:00:00", declineReason: "Booked for September." });

export const SEED_CAMPAIGNS = campaigns;
export const SEED_SETS = sets;
export const SEED_ACTIVATIONS = activations;
export const SEED_POSTS = posts;
