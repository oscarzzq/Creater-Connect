import { CREATORS, statsFor } from "./creators";
import { COUNTRY_NAMES, compact, usd } from "./format";
import { NICHE_LABEL } from "./labels";
import type { Campaign, Creator, CreatorSet, Platform, PlatformStats } from "./types";

// ---------------------------------------------------------------------------
// Pricing: fixed creator fees derived from predicted organic views.

export const PLATFORM_FEE_RATE = 0.1;
/** Creator payout per 1,000 expected organic views, by platform. */
const BASE_CPM: Record<Platform, number> = { tiktok: 11, instagram: 14, youtube: 12 };
/** Sponsored posts typically land a little under a creator's organic median. */
const SPONSORED_FACTOR = 0.85;

export const withPlatformFee = (fees: number) => Math.round(fees * (1 + PLATFORM_FEE_RATE));

export interface Quote {
  platform: Platform;
  stats: PlatformStats;
  fee: number; // creator payout for the full package
  estViews: [number, number, number]; // low, expected, high
  ecpm: number; // all-in cost per 1,000 expected views (incl. platform fee)
}

/** Creators whose views are low relative to their following charge more per view. */
function priceIndex(s: PlatformStats) {
  return 1 + Math.max(-0.2, Math.min(0.4, (s.followers / s.medianViews - 4) / 10));
}

export function quote(creator: Creator, platforms: Platform[], deliverables: number): Quote | null {
  const options = creator.platforms.filter((p) => platforms.includes(p.platform));
  if (!options.length) return null;
  const stats = [...options].sort((a, b) => b.medianViews - a.medianViews)[0];
  const expected = Math.round(stats.medianViews * SPONSORED_FACTOR * deliverables);
  const low = Math.round(stats.p25 * SPONSORED_FACTOR * deliverables);
  const high = Math.round(stats.p75 * SPONSORED_FACTOR * deliverables);
  const fee = Math.max(100, Math.round(((expected / 1000) * BASE_CPM[stats.platform] * priceIndex(stats)) / 5) * 5);
  return { platform: stats.platform, stats, fee, estViews: [low, expected, high], ecpm: (withPlatformFee(fee) / expected) * 1000 };
}

/** The brief creators in a set actually receive: the set's own ad, or the campaign default. */
export function briefFor(campaign: Pick<Campaign, "brief">, set?: Pick<CreatorSet, "brief">) {
  return set?.brief ?? campaign.brief;
}

// ---------------------------------------------------------------------------
// Matching

export type FactorKey = "audience" | "relevance" | "performance" | "efficiency" | "quality";

export interface MatchFactor {
  key: FactorKey;
  label: string;
  score: number;
  weight: number;
  detail: string;
}

export interface MatchResult {
  creator: Creator;
  eligible: boolean;
  exclusions: string[];
  score: number;
  factors: MatchFactor[];
  summary: string;
  watchOut?: string;
  quote: Quote | null;
}

const WEIGHTS: Record<FactorKey, number> = { audience: 0.3, relevance: 0.25, performance: 0.2, efficiency: 0.15, quality: 0.1 };
const AGE_BUCKETS: [keyof Creator["audience"]["ages"], number, number][] = [
  ["13–17", 13, 17], ["18–24", 18, 24], ["25–34", 25, 34], ["35–44", 35, 44], ["45+", 45, 99],
];
const BENCHMARK_ECPM = 14;
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function interestOverlap(creator: Creator, set: CreatorSet) {
  const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3);
  const mine = new Set(creator.interests.flatMap(words));
  return set.interests.filter((i) => words(i).some((w) => mine.has(w) || [...mine].some((m) => m.startsWith(w.slice(0, 5)))));
}

export function audienceShares(creator: Creator, set: CreatorSet) {
  const ageShare = AGE_BUCKETS.filter(([, lo, hi]) => hi >= set.demographics.ageMin && lo <= set.demographics.ageMax).reduce((s, [k]) => s + creator.audience.ages[k], 0);
  const geoShare = set.audienceGeo.length
    ? creator.audience.topCountries.filter((c) => set.audienceGeo.includes(c.code)).reduce((s, c) => s + c.pct, 0)
    : 100;
  return { ageShare, geoShare };
}

export function matchCreator(creator: Creator, set: CreatorSet, campaign: Pick<Campaign, "brief">): MatchResult {
  const q = quote(creator, set.platforms, briefFor(campaign, set).deliverables);
  const exclusions: string[] = [];
  const { ageShare, geoShare } = audienceShares(creator, set);
  const nicheHit = creator.niches.filter((n) => set.niches.includes(n));

  // ---- Strict qualifications: failing any removes the creator.
  if (set.excludeCreators?.includes(creator.id)) exclusions.push("Excluded by you");
  if (q && set.maxFee && q.fee > set.maxFee) exclusions.push(`Fixed fee ${usd(q.fee)} is above your ${usd(set.maxFee)} max per creator`);
  if (!q) exclusions.push(`Not on ${set.platforms.map(platformName).join(" or ")}`);
  if (set.niches.length && !nicheHit.length) exclusions.push(`Creates ${NICHE_LABEL[creator.niches[0]]} content`);
  if (set.creatorGeo.required && set.creatorGeo.countries.length && !set.creatorGeo.countries.includes(creator.country))
    exclusions.push(`Based in ${COUNTRY_NAMES[creator.country] ?? creator.country}; this set requires creators in ${set.creatorGeo.countries.join(", ")}`);
  if (set.audienceGeo.length && geoShare < 40)
    exclusions.push(`Only ${geoShare}% of their audience is in ${set.audienceGeo.join("/")}`);
  if (set.demographics.gender !== "all") {
    const share = set.demographics.gender === "women" ? creator.audience.femalePct : 100 - creator.audience.femalePct;
    if (share < 40) exclusions.push(`Audience is only ${share}% ${set.demographics.gender}`);
  }
  if (set.demographics.languages.length && !creator.languages.some((l) => set.demographics.languages.includes(l)))
    exclusions.push(`Doesn't post in ${set.demographics.languages.join(" or ")}`);
  if (q && q.stats.medianViews < set.qualification.minMedianViews)
    exclusions.push(`${compact(q.stats.medianViews)} median views, below the ${compact(set.qualification.minMedianViews)} minimum`);
  if (q && set.qualification.followerRange) {
    const [min, max] = set.qualification.followerRange;
    if (q.stats.followers < min || q.stats.followers > max) exclusions.push(`${compact(q.stats.followers)} followers, outside ${compact(min)}–${compact(max)}`);
  }
  if (!creator.audience.verified || creator.audience.quality < 80)
    exclusions.push(creator.audience.verified ? `Audience quality ${creator.audience.quality}% (min 80%)` : "Audience data not verified");

  // ---- Weighted factors.
  const g = set.demographics.gender;
  const genderScore = g === "all" ? 100 : g === "women" ? clamp(((creator.audience.femalePct - 50) / 35) * 100) : clamp(((50 - creator.audience.femalePct) / 35) * 100);
  const audienceScore = clamp(genderScore * 0.35 + clamp((ageShare / 75) * 100) * 0.35 + clamp((geoShare / 80) * 100) * 0.3);

  const interests = interestOverlap(creator, set);
  const nicheScore = nicheHit.includes(creator.niches[0]) ? 100 : nicheHit.length ? 70 : 0;
  const relevanceScore = clamp(nicheScore * 0.6 + Math.min(100, interests.length * 45) * 0.4);

  const spread = q ? (q.stats.p75 - q.stats.p25) / q.stats.medianViews : 1;
  const viewLevel = q ? Math.min(100, (q.stats.medianViews / 50_000) * 100) : 0;
  const performanceScore = clamp(viewLevel * 0.6 + clamp((1.4 - spread) * 100) * 0.4);

  const efficiencyScore = q ? clamp(100 - (q.ecpm - BENCHMARK_ECPM * 0.8) * 9) : 0;
  const qualityScore = clamp((creator.audience.quality - 70) * 3.4);

  const genderText = g === "men" ? `${100 - creator.audience.femalePct}% men` : `${creator.audience.femalePct}% women`;
  const factors: MatchFactor[] = [
    { key: "audience", label: "Audience fit", score: audienceScore, weight: WEIGHTS.audience,
      detail: `${genderText} · ${ageShare}% aged ${set.demographics.ageMin}–${set.demographics.ageMax} · ${geoShare}% in ${set.audienceGeo.join("/") || "target regions"}${creator.audience.verified ? " (verified)" : ""}` },
    { key: "relevance", label: "Content relevance", score: relevanceScore, weight: WEIGHTS.relevance,
      detail: `${nicheHit.map((n) => NICHE_LABEL[n]).join(", ") || "No niche overlap"}${interests.length ? ` · covers ${interests.slice(0, 3).join(", ")}` : ""}` },
    { key: "performance", label: "Organic view performance", score: performanceScore, weight: WEIGHTS.performance,
      detail: q ? `${compact(q.stats.medianViews)} median views on ${platformName(q.platform)} · typical range ${compact(q.stats.p25)}–${compact(q.stats.p75)}` : "No data" },
    { key: "efficiency", label: "Cost efficiency", score: efficiencyScore, weight: WEIGHTS.efficiency,
      detail: q ? `${usd(q.fee)} fee for ~${compact(q.estViews[1])} expected views · ${usd(q.ecpm, true)} effective CPM` : "—" },
    { key: "quality", label: "Audience quality", score: qualityScore, weight: WEIGHTS.quality,
      detail: `${creator.audience.quality}% genuine audience${creator.pastBrands.length ? ` · worked with ${creator.pastBrands.slice(0, 2).join(", ")}` : ""}` },
  ];

  const score = clamp(factors.reduce((s, f) => s + f.score * f.weight, 0));
  const ranked = [...factors].sort((a, b) => b.score * b.weight - a.score * a.weight).filter((f) => f.score >= 70);
  const first = creator.name.split(" ")[0];
  const reasons = ranked.slice(0, 2).map((f) => {
    switch (f.key) {
      case "audience": return `${creator.audience.femalePct}% women and ${ageShare}% aged ${set.demographics.ageMin}–${set.demographics.ageMax}, with ${geoShare}% of viewers in ${set.audienceGeo.join("/") || "your regions"}.`;
      case "relevance": return interests.length ? `Already makes content about ${interests.slice(0, 2).join(" and ")}.` : `${first} is a ${NICHE_LABEL[nicheHit[0]] ?? "relevant"} creator.`;
      case "performance": return `Reliable reach: ${compact(q!.stats.medianViews)} median views, rarely below ${compact(q!.stats.p25)}.`;
      case "efficiency": return `Strong value at ${usd(q!.ecpm, true)} per 1,000 expected views.`;
      case "quality": return `${creator.audience.quality}% genuine audience.`;
    }
  });
  const weak = factors.filter((f) => f.score < 55).sort((a, b) => a.score - b.score)[0];

  return {
    creator,
    eligible: exclusions.length === 0,
    exclusions,
    score,
    factors,
    summary: reasons.join(" ") || "Meets every requirement for this creator set.",
    watchOut: weak ? watchOut(weak.key, creator, set) : undefined,
    quote: q,
  };
}

function watchOut(key: FactorKey, creator: Creator, set: CreatorSet) {
  switch (key) {
    case "audience": return set.demographics.gender === "women" && creator.audience.femalePct < 60 ? `Audience is only ${creator.audience.femalePct}% women` : "Audience is a partial fit";
    case "relevance": return "Content is adjacent to this set's interests";
    case "performance": return "Views vary a lot from video to video";
    case "efficiency": return "Pricier per view than similar creators";
    case "quality": return "Audience quality is borderline";
  }
}

export function matchSet(set: CreatorSet, campaign: Pick<Campaign, "brief">, creators: Creator[] = CREATORS) {
  const results = creators.map((c) => matchCreator(c, set, campaign));
  return {
    matches: results.filter((r) => r.eligible).sort((a, b) => b.score - a.score),
    excluded: results.filter((r) => !r.eligible),
  };
}

/** Greedy roster: best matches first until the budget for this set runs out. */
export function recommendRoster(set: CreatorSet, campaign: Pick<Campaign, "brief">, budget: number, exclude: string[] = []) {
  const { matches } = matchSet(set, campaign);
  const requested = matches.filter((m) => set.includeCreators?.includes(m.creator.id));
  const ordered = [...requested, ...matches.filter((m) => !requested.includes(m))];
  const roster: MatchResult[] = [];
  let left = budget;
  const max = set.creatorCount?.[1] ?? 12;
  for (const m of ordered) {
    if (exclude.includes(m.creator.id) || !m.quote) continue;
    const cost = withPlatformFee(m.quote.fee);
    if (cost > left || roster.length >= max) continue;
    roster.push(m);
    left -= cost;
  }
  return roster;
}

/** Best eligible creator not already on the campaign, preferring similar price and score. */
export function suggestReplacement(set: CreatorSet, campaign: Pick<Campaign, "brief">, takenCreatorIds: string[], targetFee: number) {
  const { matches } = matchSet(set, campaign);
  return matches
    .filter((m) => !takenCreatorIds.includes(m.creator.id) && m.quote)
    .sort((a, b) => Math.abs(a.quote!.fee - targetFee) / targetFee - Math.abs(b.quote!.fee - targetFee) / targetFee + (b.score - a.score) / 200)[0];
}

export function exclusionSummary(excluded: MatchResult[]) {
  const buckets: Record<string, number> = {};
  for (const r of excluded) {
    const reason = r.exclusions[0];
    const key = reason.startsWith("Creates") ? "Different niche"
      : reason.startsWith("Not on") ? "Not on these platforms"
      : reason.startsWith("Only") ? "Audience outside target geography"
      : reason.startsWith("Based in") ? "Creator outside required location"
      : reason.includes("median views") ? "Views below minimum"
      : reason.includes("followers") ? "Outside follower range"
      : reason.startsWith("Doesn't post") ? "Language"
      : reason.startsWith("Audience is only") ? "Audience gender mismatch"
      : reason.startsWith("Excluded") ? "Excluded by you"
      : reason.startsWith("Fixed fee") ? "Above max fee"
      : "Audience quality";
    buckets[key] = (buckets[key] ?? 0) + 1;
  }
  return Object.entries(buckets).sort((a, b) => b[1] - a[1]);
}

/** Proposed guaranteed floor: 85% of the sum of each creator's low estimate. */
export function guaranteeFloor(lowEstimates: number[]) {
  const total = lowEstimates.reduce((s, n) => s + n, 0) * 0.85;
  return Math.floor(total / 5000) * 5000;
}

export function platformName(p: Platform) {
  return { tiktok: "TikTok", instagram: "Instagram Reels", youtube: "YouTube Shorts" }[p];
}
