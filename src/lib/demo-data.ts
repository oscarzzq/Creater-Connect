import type { Profile, Campaign, Offer } from "./types";

// In-memory demo data used when Supabase env vars are missing.
// Lets you click through the whole pitch without any backend setup.

export const DEMO_CREATORS: Profile[] = [
  { id: "c1", role: "creator", name: "Maya Chen", niche: "beauty", followers: 182000, price_cents: 15000 },
  { id: "c2", role: "creator", name: "Jordan Lee", niche: "fitness", followers: 95000, price_cents: 9000 },
  { id: "c3", role: "creator", name: "Sofia Reyes", niche: "lifestyle", followers: 240000, price_cents: 22000 },
  { id: "c4", role: "creator", name: "Dev Patel", niche: "tech", followers: 120000, price_cents: 18000 },
  { id: "c5", role: "creator", name: "Ava Kim", niche: "food", followers: 67000, price_cents: 7000 },
  { id: "c6", role: "creator", name: "Liam Carter", niche: "travel", followers: 310000, price_cents: 30000 },
  { id: "c7", role: "creator", name: "Nora Ali", niche: "fashion", followers: 145000, price_cents: 16000 },
  { id: "c8", role: "creator", name: "Kai Wong", niche: "gaming", followers: 89000, price_cents: 11000 },
];

export const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp1",
    business_id: "b1",
    title: "Glow Serum Launch",
    brief: "30s TikTok + 1 IG Story. Hook in first 2s, show morning routine. #glowup",
    budget_cents: 200000,
    niche_target: "beauty",
    min_followers: 50000,
    max_payout_cents: 20000,
    status: "active",
  },
  {
    id: "camp2",
    business_id: "b1",
    title: "Protein Bar Try-On",
    brief: "Gym vlog integration, taste test on camera.",
    budget_cents: 100000,
    niche_target: "fitness",
    min_followers: 30000,
    max_payout_cents: 12000,
    status: "active",
  },
];

export const DEMO_OFFERS: Offer[] = [
  { id: "o1", campaign_id: "camp1", creator_id: "c1", payout_cents: 15000, status: "pending", match_score: 96 },
  { id: "o2", campaign_id: "camp1", creator_id: "c7", payout_cents: 16000, status: "pending", match_score: 71 },
  { id: "o3", campaign_id: "camp1", creator_id: "c3", payout_cents: 22000, status: "accepted", match_score: 68 },
  { id: "o4", campaign_id: "camp2", creator_id: "c2", payout_cents: 9000, status: "pending", match_score: 94 },
  { id: "o5", campaign_id: "camp2", creator_id: "c5", payout_cents: 7000, status: "rejected", match_score: 55 },
];
