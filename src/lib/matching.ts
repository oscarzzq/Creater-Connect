import type { Profile, Campaign } from "./types";

/** Fake automation score for MVP: niche match + follower fit + price fit + jitter */
export function scoreCreator(creator: Profile, campaign: Campaign): number {
  let score = 40;
  if (creator.niche.toLowerCase() === campaign.niche_target.toLowerCase())
    score += 35;
  if (creator.followers >= campaign.min_followers) score += 15;
  else score -= 20;
  if (creator.price_cents <= campaign.max_payout_cents) score += 10;
  else score -= 15;
  // deterministic jitter from id hash so demo is stable
  let h = 0;
  for (let i = 0; i < creator.id.length; i++)
    h = (h * 31 + creator.id.charCodeAt(i)) % 100;
  score += h % 7;
  return Math.max(5, Math.min(99, score));
}

export function rankCreators(creators: Profile[], campaign: Campaign) {
  return creators
    .map((c) => ({ creator: c, score: scoreCreator(c, campaign) }))
    .sort((a, b) => b.score - a.score);
}
