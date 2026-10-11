import { creatorById } from "./creators";
import { briefFor, guaranteeFloor, matchCreator, matchSet, quote } from "./matching";
import type { Activation, ActivationStatus, Brief, Campaign, CreatorSet, Message, Post, PostMetrics, PostStatus } from "./types";

// Coherent mock world dated relative to the demo clock (2026-10-08).
// Fees, view estimates and match scores come from the pricing engine so every
// number reconciles across screens.

export const BUSINESS = {
  id: "b1",
  name: "Kestrel AI",
  tagline: "Foundation models & developer platform",
  website: "kestrel.dev",
  user: { name: "Alex Rivera", email: "alex@kestrel.dev", initials: "AR" },
};

const KESTREL = { businessId: "b1", businessName: "Kestrel AI", businessLogo: "K", businessColor: "bg-[oklch(0.45_0.12_260)]", source: "demo" as const };

export function defaultBrief(overrides: Partial<Brief> = {}): Brief {
  return {
    benefits: [],
    intendedAudience: "",
    format: "video",
    deliverables: 1,
    videoLength: "1–3 min",
    tone: "Authentic and expert. Show how you'd actually use it, no hard sell.",
    talkingPoints: [],
    mandatoryDemo: "",
    requiredMentions: ["#ad"],
    prohibited: ["Unverified performance or ROI claims", "Disparaging named competitors"],
    references: [],
    cta: { type: "link_in_bio", destination: "", measurement: "UTM link in bio" },
    hooks: [],
    script: { mode: "freedom", text: "" },
    review: { required: true, revisionRounds: 1, turnaroundDays: 2 },
    rights: { paidUsage: false, months: 0, channels: "" },
    fulfillment: { kind: "access", details: "Product access granted within 1 business day of acceptance." },
    ...overrides,
  };
}

const kestrelBrief = (o: Partial<Brief>) =>
  defaultBrief({
    requiredMentions: ["@kestrelai", "#ad"],
    prohibited: ["Benchmark claims beyond our published evals", "Disparaging named competitors", "API keys or private data on screen"],
    fulfillment: { kind: "access", details: "$500 in API credits added to your Kestrel workspace on acceptance." },
    ...o,
  });

// ---------------------------------------------------------------------------
// Builders

const campaigns: Campaign[] = [];
const sets: CreatorSet[] = [];
const activations: Activation[] = [];
const posts: Post[] = [];

function addSet(
  s: Omit<CreatorSet, "creatorGeo" | "qualification" | "includeCreators" | "excludeCreators" | "price"> &
    Partial<Pick<CreatorSet, "creatorGeo" | "qualification" | "includeCreators" | "excludeCreators" | "price">>
) {
  const full: CreatorSet = {
    creatorGeo: { countries: [], required: false },
    qualification: { minMedianViews: 10_000 },
    price: 500,
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
  autoPairAt?: string;
};

function addActivation(a: ActSeed) {
  const campaign = campaigns.find((c) => c.id === a.set.campaignId)!;
  const creator = creatorById(a.creatorId)!;
  const q = quote(creator, a.set.platforms, briefFor(campaign, a.set).deliverables, a.set.price)!;
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
    autoPairAt: a.status === "recommended" ? (a.autoPairAt ?? "2026-10-09T09:30:00") : undefined,
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
      url: live ? postUrl(act.platform, act.creatorId, i) : undefined,
      version: s.version ?? 1,
      revisionNote: s.revisionNote,
      metrics: live ? metrics(Math.round(perPost * (s.perf ?? 1)), campaign.objective, `${act.id}${i}`) : undefined,
    });
  });
}

function postUrl(platform: Activation["platform"], creatorId: string, i: number) {
  const slug = `${creatorId}${i}`;
  return {
    linkedin: `https://www.linkedin.com/posts/${slug}-activity-${7_380_000 + i}`,
    x: `https://x.com/${slug}/status/${1_840_000 + i}`,
    youtube: `https://www.youtube.com/watch?v=${slug}`,
    newsletter: `https://${slug}.substack.com/p/sponsored-${i + 1}`,
  }[platform];
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
// Kestrel 2 Launch — live, two creator sets being compared

campaigns.push({
  ...KESTREL,
  id: "camp1",
  name: "Kestrel 2 Launch",
  objective: "awareness",
  promoting: {
    kind: "product",
    name: "Kestrel 2",
    description: "Our new reasoning model: 1M-token context, native tool use and lower latency. Available in the Kestrel API today.",
    url: "https://kestrel.dev/kestrel-2",
    image: "t-ai",
  },
  status: "active",
  budget: 14000,
  startDate: "2026-09-22T00:00:00",
  endDate: "2026-11-14T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    benefits: ["Stronger multi-step reasoning on real coding and analysis tasks", "1M-token context for whole-repo and long-document work", "Native tool use with structured outputs"],
    intendedAudience: "Developers, ML engineers and technical leads evaluating models for production",
    talkingPoints: ["Show it on a real task from your own work", "Compare it honestly with the model you use today", "Explain where it fits, and where it doesn't"],
    mandatoryDemo: "Run at least one prompt live and show the output unedited",
    requiredMentions: ["@kestrelai", "#ad", "#KestrelPartner"],
    cta: { type: "tracked_link", destination: "kestrel.dev/kestrel-2?utm_source=creators", measurement: "Tracked link clicks (UTM)" },
    hooks: ["I gave Kestrel 2 my messiest codebase…", "1M tokens of context: what that actually means", "Kestrel 2 vs. my daily driver, same prompt"],
    script: { mode: "required_statements", text: "Include: “Kestrel 2 is available in the Kestrel API today, link below.”" },
  }),
  guarantee: { minViews: 0, platforms: ["youtube", "x", "linkedin"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-09-18T11:00:00",
  launchedAt: "2026-09-22T10:00:00",
});

const s1a = addSet({
  id: "set1a", price: 800, campaignId: "camp1", name: "A · AI researchers & engineers on YouTube",
  hypothesis: "Hands-on model breakdowns from AI practitioners reach the most qualified developers.",
  platforms: ["youtube"], audienceGeo: ["US", "CA"], creatorGeo: { countries: ["US", "CA"], required: false },
  demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["ai"], interests: ["LLM evals", "model benchmarks", "AI agents", "paper breakdowns"],
  qualification: { minMedianViews: 20_000 },
});
const s1b = addSet({
  id: "set1b", price: 500, campaignId: "camp1", name: "B · Developer voices on X & LinkedIn",
  hypothesis: "Short, practical posts reach early-career developers at a lower cost per view.",
  platforms: ["x", "linkedin"], audienceGeo: ["US"], creatorGeo: { countries: ["US"], required: true },
  demographics: { ageMin: 18, ageMax: 34, gender: "all", languages: ["English"] },
  niches: ["careers", "devtools", "webdev"], interests: ["learning to code", "AI coding tools", "CS students", "coding tutorials"],
  qualification: { minMedianViews: 8_000 },
});

const a1 = addActivation({ id: "act1", set: s1a, creatorId: "c1", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-22T12:10:00" });
addPosts(a1, [{ status: "verified", thumb: "t-ai", caption: "I gave Kestrel 2 a 900-page spec and asked it to find the contradictions #ad @kestrelai", due: "2026-10-10T23:59:00", submitted: "2026-09-29T18:00:00", approved: "2026-09-30T10:00:00", published: "2026-10-02T14:00:00", perf: 1.24, hook: "1M tokens of context: what that actually means" }]);
const a2 = addActivation({ id: "act2", set: s1a, creatorId: "c9", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-22T14:30:00" });
addPosts(a2, [{ status: "verified", thumb: "t-charts", caption: "Kestrel 2 evals, reproduced: where it wins and where it doesn't #ad", due: "2026-10-10T23:59:00", submitted: "2026-10-01T09:00:00", approved: "2026-10-02T11:00:00", published: "2026-10-05T17:00:00", perf: 0.96 }]);
const a3 = addActivation({ id: "act3", set: s1a, creatorId: "c10", status: "accepted", invited: "2026-09-25T11:00:00", responded: "2026-09-25T13:05:00" });
addPosts(a3, [{ status: "approved", thumb: "t-blocks", caption: "Building a research agent with Kestrel 2 tool use, start to finish #ad", due: "2026-10-10T23:59:00", submitted: "2026-10-06T10:00:00", approved: "2026-10-07T09:30:00" }]);
const a4 = addActivation({ id: "act4", set: s1a, creatorId: "c12", status: "accepted", invited: "2026-10-01T10:00:00", responded: "2026-10-03T09:00:00" });
addPosts(a4, [{ status: "draft_submitted", thumb: "t-code-dark", caption: "POV: your AI finally reads the whole repo #ad", due: "2026-10-17T23:59:00", submitted: "2026-10-07T19:00:00", hook: "I gave Kestrel 2 my messiest codebase…" }]);
addActivation({
  id: "act5", set: s1a, creatorId: "c14", status: "invited", invited: "2026-10-06T10:00:00",
  messages: [msg("m1", "creator", "Hi! Could I demo Kestrel 2 inside a real project build instead of a standalone benchmark? My audience watches my build videos more.", "2026-10-07T21:10:00")],
});
addActivation({ id: "act6", set: s1a, creatorId: "c17", status: "declined", invited: "2026-09-25T11:00:00", responded: "2026-10-05T08:00:00", declineReason: "Fully booked through November." });
// New matches wait 24 hours for the brand to decline, then pair automatically.
addActivation({ id: "act7", set: s1a, creatorId: "c11", status: "recommended", replacementFor: "act6", autoPairAt: "2026-10-08T23:30:00" });

const b1 = addActivation({ id: "act8", set: s1b, creatorId: "c15", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-23T09:00:00" });
addPosts(b1, [{ status: "published", thumb: "t-python", caption: "Kestrel 2 explained in 60 seconds, for CS students 🧠 #ad", due: "2026-10-10T23:59:00", submitted: "2026-10-04T12:00:00", approved: "2026-10-05T10:00:00", published: "2026-10-07T18:00:00", perf: 0.62, hook: "Kestrel 2 vs. my daily driver, same prompt" }]);
const b2 = addActivation({ id: "act9", set: s1b, creatorId: "c7", status: "accepted", invited: "2026-09-22T10:00:00", responded: "2026-09-23T16:20:00" });
addPosts(b2, [{ status: "revision_requested", thumb: "t-laptop-plant", caption: "Day in my life as a junior dev, now with Kestrel 2", due: "2026-10-14T23:59:00", submitted: "2026-10-03T12:00:00", version: 2, revisionNote: "Love the format! Please show the prompt and the output on screen in the first 3 seconds, and add #ad to the caption." }]);
const b3 = addActivation({
  id: "act10", set: s1b, creatorId: "c26", status: "accepted", invited: "2026-09-29T10:00:00", responded: "2026-09-30T08:00:00",
  messages: [msg("m2", "creator", "Accepted! Which email should the API credits go to? Same one as my profile works.", "2026-09-30T08:05:00"), msg("m3", "business", "Thanks Skylar, $500 in credits are in your Kestrel workspace now.", "2026-10-02T11:00:00")],
});
addPosts(b3, [{ status: "not_started", thumb: "t-code-blue", due: "2026-10-20T23:59:00" }]);
addActivation({ id: "act11", set: s1b, creatorId: "c2", status: "invited", invited: "2026-10-07T15:00:00" });

campaigns[0].guarantee!.minViews = guaranteeFloor(lowSum("camp1"));
// Two fresh matches after a budget top-up, still inside their review window.
for (const [i, m] of matchSet(s1a, campaigns[0]).matches.filter((m) => !activations.some((x) => x.campaignId === "camp1" && x.creatorId === m.creator.id)).slice(0, 2).entries())
  addActivation({ id: `act1n${i + 1}`, set: s1a, creatorId: m.creator.id, status: "recommended", autoPairAt: i === 0 ? "2026-10-09T03:30:00" : "2026-10-09T07:30:00" });

// ---------------------------------------------------------------------------
// Kestrel Code Trial — inviting creators, leads objective

campaigns.push({
  ...KESTREL,
  id: "camp2",
  name: "Kestrel Code Trial",
  objective: "leads",
  promoting: { kind: "product", name: "Kestrel Code", description: "AI coding assistant for VS Code and JetBrains with repo-aware suggestions. 14-day free trial.", url: "https://kestrel.dev/code", image: "t-ide" },
  status: "active",
  budget: 2000,
  startDate: "2026-10-01T00:00:00",
  endDate: "2026-10-31T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    benefits: ["Repo-aware completions and refactors", "Works in VS Code and JetBrains"],
    intendedAudience: "Professional developers 22–40",
    videoLength: "Under 60s",
    talkingPoints: ["Start in your own editor, on a real task", "Say what you'd normally do without it"],
    mandatoryDemo: "Accept or reject a suggestion live on screen",
    requiredMentions: ["@kestrelai", "#ad", "Code KCODE30"],
    cta: { type: "signup", destination: "kestrel.dev/code?code=KCODE30", measurement: "Trial signups via tracked link (attributed)" },
    hooks: ["I let an AI refactor my side project…", "Kestrel Code vs. my muscle memory"],
  }),
  guarantee: { minViews: 0, platforms: ["x", "linkedin"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-09-29T15:00:00",
  launchedAt: "2026-10-01T09:30:00",
});
const s2 = addSet({
  id: "set2", price: 250, campaignId: "camp2", name: "Working developers on X & LinkedIn",
  hypothesis: "", platforms: ["x", "linkedin"], audienceGeo: ["US"], creatorGeo: { countries: ["US"], required: true },
  demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["devtools", "webdev", "ai"], interests: ["AI coding tools", "developer productivity", "code review", "coding tutorials"],
  qualification: { minMedianViews: 12_000 },
});
addActivation({ id: "act20", set: s2, creatorId: "c2", status: "invited", invited: "2026-10-05T09:30:00" });
const a21 = addActivation({ id: "act21", set: s2, creatorId: "c19", status: "accepted", invited: "2026-10-01T09:30:00", responded: "2026-10-04T08:45:00", fulfillment: "pending" });
addPosts(a21, [{ status: "not_started", thumb: "t-ide", due: "2026-10-20T23:59:00" }]);
addActivation({ id: "act22", set: s2, creatorId: "c24", status: "invited", invited: "2026-10-07T11:20:00" });
addActivation({ id: "act23", set: s2, creatorId: "c5", status: "declined", invited: "2026-10-01T09:30:00", responded: "2026-10-03T12:00:00", declineReason: "Not taking AI tool sponsorships this month." });
// The replacement's 24-hour review window passed, so it paired automatically.
addActivation({ id: "act24", set: s2, creatorId: "c26", status: "invited", invited: "2026-10-03T12:05:00", replacementFor: "act23" });
campaigns[1].guarantee!.minViews = guaranteeFloor(lowSum("camp2"));

// ---------------------------------------------------------------------------
// API Developer Week — awaiting content review, 2 posts per creator, paid usage add-on

campaigns.push({
  ...KESTREL,
  id: "camp4",
  name: "API Developer Week",
  objective: "traffic",
  promoting: { kind: "product", name: "Kestrel API", description: "One API for Kestrel models, embeddings and batch jobs. Free tier with 1M tokens a month.", url: "https://kestrel.dev/docs", image: "t-code-screen" },
  status: "active",
  budget: 7500,
  startDate: "2026-09-15T00:00:00",
  endDate: "2026-10-31T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    deliverables: 2,
    benefits: ["Free tier: 1M tokens a month", "One SDK for chat, embeddings and batch"],
    intendedAudience: "Developers building their first AI feature",
    talkingPoints: ["Post 1: build something small with the API in one sitting", "Post 2: what you shipped a week later"],
    mandatoryDemo: "Show the code and the API response on screen",
    cta: { type: "tracked_link", destination: "kestrel.dev/docs?utm_source=creators", measurement: "Tracked link clicks (UTM)" },
    hooks: ["I built an AI feature in one evening", "From zero to API call in 5 minutes"],
    rights: { paidUsage: true, months: 3, channels: "Kestrel AI paid social (LinkedIn, YouTube)" },
  }),
  guarantee: { minViews: 0, platforms: ["youtube", "linkedin"], windowDays: 30, verification: "Platform API, organic views only", remedy: "credit" },
  createdAt: "2026-09-10T09:00:00",
  launchedAt: "2026-09-15T10:00:00",
});
const s4 = addSet({
  id: "set4", price: 1200, campaignId: "camp4", name: "Developer & product educators",
  hypothesis: "", platforms: ["youtube", "linkedin"], audienceGeo: ["US", "CA"],
  demographics: { ageMin: 18, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["devtools", "webdev", "ai", "product"], interests: ["coding tutorials", "web development", "AI coding tools", "product launches"],
  qualification: { minMedianViews: 20_000 },
});
const h1 = addActivation({ id: "act30", set: s4, creatorId: "c16", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-18T09:00:00" });
addPosts(h1, [
  { status: "draft_submitted", thumb: "t-laptop-code", caption: "Building my first Kestrel API feature in one evening #ad", due: "2026-10-12T23:59:00", submitted: "2026-10-07T15:00:00", hook: "I built an AI feature in one evening" },
  { status: "not_started", thumb: "t-dashboard", due: "2026-10-26T23:59:00" },
]);
const h2 = addActivation({ id: "act31", set: s4, creatorId: "c14", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-19T17:30:00" });
addPosts(h2, [
  { status: "draft_submitted", thumb: "t-html", caption: "Wiring the Kestrel API into a real frontend", due: "2026-10-12T23:59:00", submitted: "2026-10-07T14:00:00" },
  { status: "not_started", thumb: "t-code-screen", due: "2026-10-26T23:59:00" },
]);
const h3 = addActivation({ id: "act32", set: s4, creatorId: "c3", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-18T12:00:00" });
addPosts(h3, [
  { status: "revision_requested", thumb: "t-workspace", caption: "From zero to API call: founder edition", due: "2026-10-12T23:59:00", submitted: "2026-10-02T11:00:00", version: 2, revisionNote: "Please re-record the screen capture at a larger font size. The walkthrough itself is great, keep that." },
  { status: "not_started", thumb: "t-laptop-glow", due: "2026-10-26T23:59:00" },
]);
const h4 = addActivation({ id: "act33", set: s4, creatorId: "c11", status: "accepted", invited: "2026-09-16T10:00:00", responded: "2026-09-17T08:30:00" });
addPosts(h4, [
  { status: "approved", thumb: "t-editor", caption: "From zero to API call in 5 minutes #ad", due: "2026-10-12T23:59:00", submitted: "2026-09-29T10:00:00", approved: "2026-09-30T10:00:00" },
  { status: "draft_submitted", thumb: "t-code-blue", caption: "One week later: what I shipped with the Kestrel API", due: "2026-10-26T23:59:00", submitted: "2026-10-08T08:00:00" },
]);
campaigns[2].guarantee!.minViews = guaranteeFloor(lowSum("camp4"));

// ---------------------------------------------------------------------------
// Agents SDK Launch — completed, guarantee exceeded

campaigns.push({
  ...KESTREL,
  id: "camp3",
  name: "Agents SDK Launch",
  objective: "awareness",
  promoting: { kind: "product", name: "Kestrel Agents SDK", description: "Open-source SDK for building tool-using agents in Python and TypeScript.", url: "https://kestrel.dev/agents", image: "t-blocks" },
  status: "completed",
  budget: 4500,
  startDate: "2026-07-28T00:00:00",
  endDate: "2026-09-12T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    benefits: ["Tool use, memory and tracing built in", "Python and TypeScript"],
    intendedAudience: "AI engineers and backend developers",
    talkingPoints: ["Build a small agent on camera", "Show the trace view"],
    mandatoryDemo: "Run the agent and show the trace",
    cta: { type: "link_in_bio", destination: "kestrel.dev/agents", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["youtube", "x"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-07-21T10:00:00",
  launchedAt: "2026-07-28T10:00:00",
});
const s3 = addSet({
  id: "set3", price: 800, campaignId: "camp3", name: "AI engineers & educators",
  hypothesis: "", platforms: ["youtube", "x"], audienceGeo: ["US", "CA"],
  demographics: { ageMin: 18, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["ai", "devtools", "startups"], interests: ["AI agents", "AI coding tools", "LLM evals"],
  qualification: { minMedianViews: 12_000 },
});
(
  [
    ["act40", "c1", "t-blocks", "I built an agent that triages my inbox (safely) #ad", "2026-08-20T15:00:00", 1.42],
    ["act41", "c3", "t-workspace", "The agent that writes my startup's weekly report", "2026-08-25T15:00:00", 1.31],
    ["act42", "c11", "t-editor", "Agents SDK: tool use in 20 lines", "2026-08-29T15:00:00", 1.08],
    ["act43", "c9", "t-charts", "Tracing an agent step by step", "2026-09-02T15:00:00", 1.12],
    ["act44", "c12", "t-robot", "Me pretending I always wrote tests for my agents", "2026-09-05T15:00:00", 1.35],
  ] as const
).forEach(([id, creatorId, thumb, caption, published, perf]) => {
  const act = addActivation({ id, set: s3, creatorId, status: "accepted", invited: "2026-07-28T10:00:00", responded: "2026-07-29T10:00:00" });
  addPosts(act, [{ status: "verified", thumb, caption, due: "2026-09-10T23:59:00", submitted: plusDays(published, -3), approved: plusDays(published, -2), published, perf }]);
});
campaigns[3].guarantee!.minViews = guaranteeFloor(lowSum("camp3", ["accepted"]));

// ---------------------------------------------------------------------------
// Evals Dashboard — underdelivered, make-good in progress

campaigns.push({
  ...KESTREL,
  id: "camp5",
  name: "Evals Dashboard",
  objective: "awareness",
  promoting: { kind: "product", name: "Kestrel Evals", description: "Run, compare and share model evaluations from one dashboard.", url: "https://kestrel.dev/evals", image: "t-dashboard" },
  status: "make_good",
  budget: 2500,
  startDate: "2026-08-10T00:00:00",
  endDate: "2026-09-20T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    benefits: ["Compare models on your own test sets", "Share eval reports with your team"],
    talkingPoints: ["Show an eval run on a real dataset"],
    cta: { type: "link_in_bio", destination: "kestrel.dev/evals", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["linkedin", "x"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  makeGood: {
    reason: "Verified views fell short of the guarantee when the 30-day window closed on Oct 5.",
    remedy: "2 supplementary creators added at our expense. Their views count toward your guarantee.",
    addedAt: "2026-10-06T10:00:00",
  },
  createdAt: "2026-08-04T10:00:00",
  launchedAt: "2026-08-10T10:00:00",
});
const s5 = addSet({
  id: "set5", price: 400, campaignId: "camp5", name: "ML & data engineers on LinkedIn & X",
  hypothesis: "", platforms: ["linkedin", "x"], audienceGeo: ["US"],
  demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["ai", "data"], interests: ["LLM evals", "MLOps", "model benchmarks"],
  qualification: { minMedianViews: 15_000 },
});
(
  [
    ["act50", "c14", "t-dashboard", "Evals for people who hate spreadsheets", "2026-08-20T15:00:00", 0.4],
    ["act51", "c5", "t-analytics", "Spreadsheet evals vs. a real eval tool", "2026-08-28T15:00:00", 0.36],
    ["act52", "c10", "t-charts", "How I pick a model for a new project", "2026-09-05T15:00:00", 0.38],
  ] as const
).forEach(([id, creatorId, thumb, caption, published, perf]) => {
  const act = addActivation({ id, set: s5, creatorId, status: "accepted", invited: "2026-08-10T10:00:00", responded: "2026-08-11T10:00:00" });
  addPosts(act, [{ status: "verified", thumb, caption, due: "2026-09-10T23:59:00", submitted: plusDays(published, -3), approved: plusDays(published, -2), published, perf }]);
});
campaigns[4].guarantee!.minViews = guaranteeFloor(lowSum("camp5", ["accepted"]));
const mg1 = addActivation({ id: "act53", set: s5, creatorId: "c15", status: "accepted", invited: "2026-10-06T10:00:00", responded: "2026-10-06T15:00:00", supplementary: true });
addPosts(mg1, [{ status: "approved", thumb: "t-python", caption: "Evaluating 3 models in 10 minutes", due: "2026-10-14T23:59:00", submitted: "2026-10-07T10:00:00", approved: "2026-10-08T09:00:00" }]);
const mg2 = addActivation({ id: "act54", set: s5, creatorId: "c12", status: "accepted", invited: "2026-10-06T10:00:00", responded: "2026-10-07T09:00:00", supplementary: true });
addPosts(mg2, [{ status: "not_started", thumb: "t-ai", due: "2026-10-20T23:59:00" }]);

// ---------------------------------------------------------------------------
// Kestrel Enterprise — draft, two creator sets defined

campaigns.push({
  ...KESTREL,
  id: "camp6",
  name: "Kestrel Enterprise",
  objective: "awareness",
  promoting: { kind: "product", name: "Kestrel Enterprise", description: "SSO, audit logs, data residency and zero data retention for regulated teams.", url: "https://kestrel.dev/enterprise", image: "t-lock" },
  status: "draft",
  budget: 4000,
  startDate: "2026-11-01T00:00:00",
  endDate: "2026-12-15T23:59:00",
  allocation: "automatic",
  brief: kestrelBrief({
    benefits: ["Zero data retention by default"],
    talkingPoints: ["Explain what security teams check before approving an AI vendor"],
    cta: { type: "link_in_bio", destination: "kestrel.dev/enterprise", measurement: "UTM link in bio" },
  }),
  guarantee: { minViews: 0, platforms: ["linkedin", "x", "youtube"], windowDays: 30, verification: "Platform API, organic views only", remedy: "supplementary_creators" },
  createdAt: "2026-10-07T16:00:00",
});
addSet({
  id: "set6a", price: 500, campaignId: "camp6", name: "A · Security practitioners",
  hypothesis: "Security voices build trust with the teams that approve AI vendors.",
  platforms: ["linkedin", "x"], audienceGeo: ["US", "CA", "GB"],
  demographics: { ageMin: 25, ageMax: 54, gender: "all", languages: ["English"] },
  niches: ["security"], interests: ["zero trust", "threat intel", "security tooling"],
  qualification: { minMedianViews: 10_000 },
});
addSet({
  id: "set6b", price: 600, campaignId: "camp6", name: "B · Platform & cloud engineers",
  hypothesis: "Platform engineers influence which AI tools pass internal review.",
  platforms: ["youtube"], audienceGeo: ["US"],
  demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] },
  niches: ["cloud", "devtools"], interests: ["platform engineering", "DevOps", "Kubernetes"],
  qualification: { minMedianViews: 15_000 },
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

otherBrand("camp7", "b2", "Fernpoint Security", "F", "bg-[oklch(0.45_0.08_250)]", "Securing AI Agents", "Fernpoint Agent Guard", "t-security",
  { talkingPoints: ["Show an agent request before and after a policy check", "Explain audit trails in plain English"], prohibited: ["No claims that it stops all attacks"], cta: { type: "link_in_bio", destination: "fernpoint.io", measurement: "UTM link in bio" }, requiredMentions: ["@fernpoint", "#ad"], fulfillment: { kind: "access", details: "Sandbox tenant provisioned on acceptance." } }, "2026-11-20T23:59:00");
const s7 = addSet({ id: "set7", price: 900, campaignId: "camp7", name: "AI & security practitioners", hypothesis: "", platforms: ["youtube"], audienceGeo: ["US", "CA"], demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["ai", "security"], interests: ["AI agents", "AI safety"], qualification: { minMedianViews: 20_000 } });
addActivation({ id: "act80", set: s7, creatorId: "c1", status: "invited", invited: "2026-10-07T10:00:00" });
addActivation({ id: "act81", set: s7, creatorId: "c9", status: "invited", invited: "2026-10-07T10:00:00" });

otherBrand("camp8", "b3", "Ledgerline", "L", "bg-[oklch(0.42_0.06_160)]", "AI Receipts Beta", "Ledgerline AI Receipts", "t-candles",
  { format: "post", videoLength: "Sponsored section", fulfillment: { kind: "none", details: "" }, talkingPoints: ["Show a receipt turning into a categorized expense in the first 3 seconds"], cta: { type: "promo_code", destination: "LEDGER20", measurement: "Promo code" }, review: { required: false, revisionRounds: 0, turnaroundDays: 0 } }, "2026-10-30T23:59:00");
const s8 = addSet({ id: "set8", price: 650, campaignId: "camp8", name: "Founders & AI newsletters", hypothesis: "", platforms: ["newsletter", "linkedin"], audienceGeo: ["US"], demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["ai", "startups", "fintech"], interests: ["AI tools for teams", "startup finance"], qualification: { minMedianViews: 10_000 } });
addActivation({ id: "act82", set: s8, creatorId: "c1", status: "invited", invited: "2026-10-08T08:15:00" });
const k2 = addActivation({ id: "act83", set: s8, creatorId: "c3", status: "accepted", invited: "2026-10-02T10:00:00", responded: "2026-10-03T10:00:00" });
addPosts(k2, [{ status: "not_started", thumb: "t-candles", due: "2026-10-30T23:59:00" }]);

otherBrand("camp9", "b4", "Stackbeam", "S", "bg-[oklch(0.3_0.02_275)]", "Observability Free Tier", "Stackbeam Observability", "t-servers",
  { talkingPoints: ["Trace one slow request end to end"], cta: { type: "tracked_link", destination: "stackbeam.dev/free", measurement: "Tracked link" } }, "2026-11-05T23:59:00");
const s9 = addSet({ id: "set9", price: 300, campaignId: "camp9", name: "Backend & platform engineers", hypothesis: "", platforms: ["x"], audienceGeo: ["US"], demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["devtools", "cloud"], interests: ["observability", "DevOps"], qualification: { minMedianViews: 15_000 } });
addActivation({ id: "act84", set: s9, creatorId: "c2", status: "invited", invited: "2026-10-06T10:00:00" });

otherBrand("camp10", "b5", "Northfold", "N", "bg-[oklch(0.55_0.12_350)]", "Meeting Notes AI", "Northfold Notes", "t-mic", { format: "post", videoLength: "Long-form post" }, "2026-10-20T23:59:00");
const s10 = addSet({ id: "set10", price: 500, campaignId: "camp10", name: "AI for teams", hypothesis: "", platforms: ["newsletter", "linkedin"], audienceGeo: ["US"], demographics: { ageMin: 25, ageMax: 44, gender: "all", languages: ["English"] }, niches: ["saas", "ai"], interests: [], qualification: { minMedianViews: 20_000 } });
addActivation({ id: "act85", set: s10, creatorId: "c1", status: "declined", invited: "2026-09-20T10:00:00", responded: "2026-09-21T10:00:00", declineReason: "Booked for September." });

export const SEED_CAMPAIGNS = campaigns;
export const SEED_SETS = sets;
export const SEED_ACTIVATIONS = activations;
export const SEED_POSTS = posts;
