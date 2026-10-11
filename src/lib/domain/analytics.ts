// Synthetic platform analytics for the demo. In production these come from the
// creator's connected accounts (LinkedIn and X analytics, YouTube Analytics,
// newsletter platform stats) and our own campaign history. Values are deterministic per
// creator so they stay stable across renders and reloads.
import { audienceShares } from "./matching";
import type { Creator, CreatorSet, Platform } from "./types";

function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ANALYTICS_SOURCE: Record<Platform, string> = {
  linkedin: "LinkedIn analytics",
  x: "X analytics",
  youtube: "YouTube Analytics",
  newsletter: "newsletter stats",
};

const CITIES: Record<string, string[]> = {
  US: ["Los Angeles", "New York", "Chicago", "Houston", "Atlanta", "Phoenix", "Dallas", "Miami"],
  CA: ["Toronto", "Vancouver", "Montreal"],
  GB: ["London", "Manchester"],
  AU: ["Sydney", "Melbourne"],
  MX: ["Mexico City", "Guadalajara"],
  IN: ["Mumbai", "Bengaluru"],
};

export interface CreatorAnalytics {
  syncedHoursAgo: number;
  /** Reach on the last 20 posts on the primary platform, oldest first. */
  recent: { platform: Platform; views: number[]; median: number };
  /** Platform-native content stats (watch time, open rate, reposts…), already formatted. */
  contentStats: { label: string; value: string }[];
  engagementPct: number;
  sharesPer1k: number;
  followerGrowth30d: number;
  returningPct: number;
  traffic: { label: string; pct: number }[];
  /** Share of audience activity per hour (local time), 24 values summing to ~100. */
  activeHours: number[];
  peakWindow: string;
  topCities: { name: string; pct: number }[];
  interests: { label: string; pct: number }[];
  reliability: { onTimePct: number; sponsoredVsOrganicPct: number | null; avgRevisions: number; campaigns: number };
}

const fmtHour = (h: number) => `${((h + 11) % 12) + 1}${h < 12 ? "am" : "pm"}`;

export function creatorAnalytics(creator: Creator): CreatorAnalytics {
  const r = rng(creator.id);
  const main = [...creator.platforms].sort((a, b) => b.medianViews - a.medianViews)[0];

  // Lognormal-ish spread around the median, bounded by the creator's typical range.
  const views = Array.from({ length: 20 }, () => {
    const u = r();
    const v = u < 0.5 ? main.p25 + (main.medianViews - main.p25) * (u * 2) : main.medianViews + (main.p75 - main.medianViews) * ((u - 0.5) * 2);
    const outlier = r() > 0.93 ? 1.8 + r() * 1.6 : 1;
    return Math.round(v * outlier);
  });

  // Evening-heavy activity curve with a per-creator peak.
  const peak = 18 + Math.floor(r() * 4);
  const raw = Array.from({ length: 24 }, (_, h) => {
    const d = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    return Math.exp(-(d * d) / 18) + (h >= 7 && h <= 9 ? 0.25 : 0) + 0.04;
  });
  const total = raw.reduce((s, x) => s + x, 0);
  const activeHours = raw.map((x) => Math.round((x / total) * 1000) / 10);

  const split = (labels: [string, string, string, string], lead: number) => {
    const rest = 100 - lead;
    const b = Math.round(rest * 0.45);
    const c = Math.round(rest * 0.3);
    return [{ label: labels[0], pct: lead }, { label: labels[1], pct: b }, { label: labels[2], pct: c }, { label: labels[3], pct: rest - b - c }];
  };
  const traffic = {
    linkedin: split(["Feed", "Reposts & shares", "Search", "Profile"], 52 + Math.floor(r() * 16)),
    x: split(["For You", "Following", "Reposts & quotes", "Search"], 48 + Math.floor(r() * 18)),
    youtube: split(["Suggested videos", "Subscriptions", "Search", "Browse"], 38 + Math.floor(r() * 14)),
    newsletter: split(["Subscriber inbox", "Web archive", "Forwards", "Social shares"], 78 + Math.floor(r() * 10)),
  }[main.platform];

  const contentStats = {
    linkedin: [["Engagement", `${main.engagementRate}%`], ["Reposts per post", `${Math.round(8 + r() * 30)}`], ["Comments per post", `${Math.round(20 + r() * 60)}`]],
    x: [["Engagement", `${main.engagementRate}%`], ["Bookmarks per 1K views", `${(2 + r() * 6).toFixed(1)}`], ["Reposts per post", `${Math.round(15 + r() * 80)}`]],
    youtube: [["Avg. view duration", `${Math.floor(2 + r() * 5)}m ${String(Math.floor(r() * 60)).padStart(2, "0")}s`], ["Avg. % viewed", `${Math.round(32 + r() * 22)}%`], ["Engagement", `${main.engagementRate}%`]],
    newsletter: [["Open rate", `${Math.round((main.medianViews / main.followers) * 100)}%`], ["Click rate", `${(2.5 + r() * 4).toFixed(1)}%`], ["Engagement", `${main.engagementRate}%`]],
  }[main.platform].map(([label, value]) => ({ label, value }));

  const topCities: { name: string; pct: number }[] = [];
  for (const c of creator.audience.topCountries.slice(0, 2)) {
    const pool = CITIES[c.code] ?? [];
    const picks = c.code === creator.country ? [creator.city, ...pool.filter((x) => x !== creator.city)] : pool;
    picks.slice(0, c.code === creator.audience.topCountries[0].code ? 3 : 1).forEach((name, i) => topCities.push({ name, pct: Math.max(2, Math.round(c.pct * (i === 0 ? 0.22 : 0.11) - r() * 2)) }));
  }

  const interests = [...creator.interests.slice(0, 4)].map((label, i) => ({ label, pct: Math.round(64 - i * 11 - r() * 6) }));

  const campaigns = creator.completedCampaigns;
  return {
    syncedHoursAgo: 1 + Math.floor(r() * 5),
    recent: { platform: main.platform, views, median: main.medianViews },
    contentStats,
    engagementPct: main.engagementRate,
    sharesPer1k: Math.round((3 + r() * 9) * 10) / 10,
    followerGrowth30d: Math.round((0.8 + r() * 6.5) * 10) / 10,
    returningPct: Math.round(22 + r() * 24),
    traffic,
    activeHours,
    peakWindow: `${fmtHour(peak - 1)}–${fmtHour((peak + 2) % 24)}`,
    topCities: topCities.sort((a, b) => b.pct - a.pct).slice(0, 4),
    interests,
    reliability: {
      onTimePct: Math.round(86 + r() * 14),
      sponsoredVsOrganicPct: campaigns >= 3 ? Math.round(74 + r() * 26) : null,
      avgRevisions: Math.round(r() * 12) / 10,
      campaigns,
    },
  };
}

/**
 * Share of a creator's audience that falls inside a set's target demographic
 * (gender × age × geography, treated as independent).
 */
export function targetAudienceShare(creator: Creator, set: CreatorSet) {
  const { ageShare, geoShare } = audienceShares(creator, set);
  const g = set.demographics.gender;
  const genderShare = g === "all" ? 100 : g === "women" ? creator.audience.femalePct : 100 - creator.audience.femalePct;
  const geo = set.audienceGeo.length ? geoShare : 100;
  return { pct: Math.round((genderShare / 100) * (ageShare / 100) * (geo / 100) * 100), genderShare, ageShare, geoShare: geo };
}
