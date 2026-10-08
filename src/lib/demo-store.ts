import { DEMO_OFFERS } from "./demo-data";
import type { Offer } from "./types";

const KEY = "cc-demo-offers-v1";

// Shared demo store so /business and /creator stay in sync without a backend.
// Live Supabase data bypasses this entirely.
export function loadDemoOffers(): Offer[] {
  if (typeof window === "undefined") return DEMO_OFFERS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEMO_OFFERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Offer[]) : DEMO_OFFERS;
  } catch {
    return DEMO_OFFERS;
  }
}

export function saveDemoOffers(offers: Offer[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(offers));
  } catch {
    // storage unavailable — ignore
  }
}

export function resetDemoOffers() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
