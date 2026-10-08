export type Role = "business" | "creator";
export type OfferStatus = "pending" | "accepted" | "rejected";

export interface Profile {
  id: string;
  role: Role;
  name: string;
  niche: string;
  followers: number;
  price_cents: number;
}

export interface Campaign {
  id: string;
  business_id: string;
  title: string;
  brief: string;
  budget_cents: number;
  niche_target: string;
  min_followers: number;
  max_payout_cents: number;
  status: string;
  created_at?: string;
}

export interface Offer {
  id: string;
  campaign_id: string;
  creator_id: string;
  payout_cents: number;
  status: OfferStatus;
  match_score: number;
  created_at?: string;
  // joined
  campaign?: Campaign;
  creator?: Profile;
}

export const NICHE_OPTIONS = [
  "lifestyle",
  "fitness",
  "beauty",
  "tech",
  "food",
  "travel",
  "fashion",
  "gaming",
];

export function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
