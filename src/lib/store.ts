"use client";

import { useSyncExternalStore } from "react";
import { creatorById } from "./domain/creators";
import { TODAY, daysBetween } from "./domain/format";
import { matchCreator, matchSet, suggestReplacement } from "./domain/matching";
import { SEED_ACTIVATIONS, SEED_CAMPAIGNS, SEED_POSTS, SEED_SETS } from "./domain/seed";
import type { Activation, Campaign, CreatorSet, Post } from "./domain/types";
import type { World } from "./domain/metrics";

// Client-side demo store shared by the business and creator apps.
// Persists to localStorage and syncs across tabs.

export type AppState = World;

const KEY = "cc-store-v3";
const SEED: AppState = {
  campaigns: SEED_CAMPAIGNS,
  sets: SEED_SETS,
  activations: SEED_ACTIVATIONS,
  posts: SEED_POSTS,
  inbox: { read: {}, resolved: {} },
};

let state: AppState = SEED;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function valid(s: unknown): s is AppState {
  const x = s as AppState;
  return !!x && Array.isArray(x.campaigns) && Array.isArray(x.sets) && Array.isArray(x.activations) && Array.isArray(x.posts) && !!x.inbox;
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (valid(parsed)) state = parsed;
    }
  } catch {
    // storage unavailable: keep seed
  }
  state = expireStale(state);
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    try {
      const next = e.newValue ? JSON.parse(e.newValue) : SEED;
      if (valid(next)) {
        state = next;
        emit();
      }
    } catch {
      // ignore malformed writes
    }
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!loaded) {
    load();
    if (state !== SEED) queueMicrotask(emit);
  }
  return () => listeners.delete(l);
}

function setState(update: (s: AppState) => AppState) {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  emit();
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => SEED);
}

// ---------------------------------------------------------------------------
// Helpers

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** Wall-clock time on the demo date so new events sort after seeded ones. */
export function nowIso() {
  const real = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${TODAY.getFullYear()}-${p(TODAY.getMonth() + 1)}-${p(TODAY.getDate())}T${p(real.getHours())}:${p(real.getMinutes())}:${p(real.getSeconds())}`;
}

export function plusDays(iso: string, days: number, endOfDay = false) {
  const d = new Date(new Date(iso).getTime() + days * 86_400_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${endOfDay ? "23:59:00" : `${p(d.getHours())}:${p(d.getMinutes())}:00`}`;
}

function expireStale(s: AppState): AppState {
  if (!s.activations.some((a) => a.status === "invited" && a.expiresAt && daysBetween(TODAY, a.expiresAt) < 0)) return s;
  return {
    ...s,
    activations: s.activations.map((a) => (a.status === "invited" && a.expiresAt && daysBetween(TODAY, a.expiresAt) < 0 ? { ...a, status: "expired" as const } : a)),
  };
}

const patchAct = (s: AppState, id: string, fn: (a: Activation) => Activation): AppState => ({ ...s, activations: s.activations.map((a) => (a.id === id ? fn(a) : a)) });
const patchPost = (s: AppState, id: string, fn: (p: Post) => Post): AppState => ({ ...s, posts: s.posts.map((p) => (p.id === id ? fn(p) : p)) });

function invite(a: Activation, at: string): Activation {
  return { ...a, status: "invited", approvedAt: a.approvedAt ?? at, invitedAt: at, expiresAt: plusDays(at, 7) };
}

/** Builds a recommended activation from a match. */
export function activationFromMatch(set: CreatorSet, campaign: Campaign, creatorId: string, extra: Partial<Activation> = {}): Activation | null {
  const creator = creatorById(creatorId);
  if (!creator) return null;
  const m = matchCreator(creator, set, campaign);
  if (!m.quote) return null;
  return {
    id: uid("act"),
    campaignId: campaign.id,
    setId: set.id,
    creatorId,
    platform: m.quote.platform,
    status: "recommended",
    fee: m.quote.fee,
    estViews: m.quote.estViews,
    matchScore: m.score,
    fulfillment: "not_needed",
    messages: [],
    ...extra,
  };
}

function postsFor(a: Activation, c: Campaign, at: string): Post[] {
  const creator = creatorById(a.creatorId);
  const due = [plusDays(at, 14, true), c.endDate].sort()[0];
  return Array.from({ length: c.brief.deliverables }, (_, i) => ({
    id: `${a.id}-p${i + 1}`,
    activationId: a.id,
    campaignId: a.campaignId,
    setId: a.setId,
    creatorId: a.creatorId,
    platform: a.platform,
    index: i + 1,
    status: "not_started" as const,
    thumbnail: creator?.samples[i % creator.samples.length] ?? "c-flatlay",
    caption: "",
    duration: 35,
    dueAt: i === 0 ? due : [plusDays(at, 21, true), c.endDate].sort()[0],
    version: 1,
  }));
}

// ---------------------------------------------------------------------------
// Business actions

export const actions = {
  /** Approve recommended creators. In a live campaign they're invited immediately. */
  approve(ids: string[]) {
    const at = nowIso();
    setState((s) => {
      let next = s;
      for (const id of ids) {
        const a = next.activations.find((x) => x.id === id);
        if (!a || a.status !== "recommended") continue;
        const c = next.campaigns.find((x) => x.id === a.campaignId)!;
        next = patchAct(next, id, (x) => (c.status === "draft" ? { ...x, status: "approved", approvedAt: at } : invite(x, at)));
        if (a.replacementFor) next = patchAct(next, a.replacementFor, (x) => ({ ...x, status: "declined" }));
      }
      return next;
    });
  },

  remove(id: string) {
    setState((s) => patchAct(s, id, (a) => ({ ...a, status: "removed" })));
  },

  /** Undo an approval on a draft campaign. */
  unapprove(id: string) {
    setState((s) => patchAct(s, id, (a) => (a.status === "approved" ? { ...a, status: "recommended", approvedAt: undefined } : a)));
  },

  /** Add the next best eligible creators not already on the campaign. */
  requestAlternatives(setId: string, count = 3) {
    setState((s) => {
      const set = s.sets.find((x) => x.id === setId)!;
      const c = s.campaigns.find((x) => x.id === set.campaignId)!;
      const taken = new Set(s.activations.filter((a) => a.campaignId === c.id).map((a) => a.creatorId));
      const fresh = matchSet(set, c)
        .matches.filter((m) => !taken.has(m.creator.id))
        .slice(0, count)
        .map((m) => activationFromMatch(set, c, m.creator.id))
        .filter((a): a is Activation => !!a);
      return { ...s, activations: [...s.activations, ...fresh] };
    });
  },

  /** Swap a suggested replacement for the next comparable creator. */
  nextReplacement(id: string) {
    setState((s) => {
      const a = s.activations.find((x) => x.id === id);
      if (!a) return s;
      const set = s.sets.find((x) => x.id === a.setId)!;
      const c = s.campaigns.find((x) => x.id === a.campaignId)!;
      const taken = s.activations.filter((x) => x.campaignId === c.id).map((x) => x.creatorId);
      const pick = suggestReplacement(set, c, taken, a.fee);
      const removed = patchAct(s, id, (x) => ({ ...x, status: "removed" }));
      if (!pick) return removed;
      const repl = activationFromMatch(set, c, pick.creator.id, { replacementFor: a.replacementFor });
      return repl ? { ...removed, activations: [...removed.activations, repl] } : removed;
    });
  },

  launch(campaignId: string) {
    const at = nowIso();
    setState((s) => ({
      ...s,
      campaigns: s.campaigns.map((c) => (c.id === campaignId ? { ...c, status: "active", launchedAt: at } : c)),
      activations: s.activations.map((a) =>
        a.campaignId !== campaignId ? a : a.status === "approved" ? invite(a, at) : a.status === "recommended" ? { ...a, status: "removed" } : a
      ),
    }));
  },

  /** Save a campaign created in the builder (draft or launched). */
  saveCampaign(campaign: Campaign, sets: CreatorSet[], acts: Activation[]) {
    setState((s) => ({
      ...s,
      campaigns: [campaign, ...s.campaigns.filter((c) => c.id !== campaign.id)],
      sets: [...s.sets.filter((x) => x.campaignId !== campaign.id), ...sets],
      activations: [...s.activations.filter((x) => x.campaignId !== campaign.id), ...acts],
    }));
  },

  /** Copy a creator set's targeting so a variant can be tested; it starts with fresh recommendations. */
  duplicateSet(setId: string) {
    setState((s) => {
      const src = s.sets.find((x) => x.id === setId);
      const c = src && s.campaigns.find((x) => x.id === src.campaignId);
      if (!src || !c) return s;
      const copy: CreatorSet = { ...src, id: uid("set"), name: `${src.name} (copy)`, hypothesis: "" };
      const taken = new Set(s.activations.filter((a) => a.campaignId === c.id && a.status !== "removed").map((a) => a.creatorId));
      const recs = matchSet(copy, c)
        .matches.filter((m) => !taken.has(m.creator.id))
        .slice(0, 3)
        .map((m) => activationFromMatch(copy, c, m.creator.id))
        .filter((a): a is Activation => !!a);
      return { ...s, sets: [...s.sets, copy], activations: [...s.activations, ...recs] };
    });
  },

  approvePost(postId: string) {
    setState((s) => patchPost(s, postId, (p) => ({ ...p, status: "approved", approvedAt: nowIso(), revisionNote: undefined })));
  },

  requestRevision(postId: string, note: string) {
    setState((s) => patchPost(s, postId, (p) => ({ ...p, status: "revision_requested", revisionNote: note })));
  },

  reply(actId: string, text: string, from: "business" | "creator" = "business") {
    setState((s) => patchAct(s, actId, (a) => ({ ...a, messages: [...a.messages, { id: uid("m"), from, text, at: nowIso() }] })));
  },

  markRead(ids: string[]) {
    setState((s) => ({ ...s, inbox: { ...s.inbox, read: { ...s.inbox.read, ...Object.fromEntries(ids.map((id) => [id, true])) } } }));
  },

  markUnread(id: string) {
    setState((s) => ({ ...s, inbox: { ...s.inbox, read: { ...s.inbox.read, [id]: false } } }));
  },

  resolve(id: string) {
    setState((s) => ({ ...s, inbox: { read: { ...s.inbox.read, [id]: true }, resolved: { ...s.inbox.resolved, [id]: true } } }));
  },

  // -------------------------------------------------------------------------
  // Creator actions

  respond(actId: string, response: "accepted" | "declined", reason?: string) {
    const at = nowIso();
    setState((s) => {
      const a = s.activations.find((x) => x.id === actId);
      const c = a && s.campaigns.find((x) => x.id === a.campaignId);
      if (!a || !c) return s;
      if (response === "accepted") {
        const next = patchAct(s, actId, (x) => ({
          ...x, status: "accepted", respondedAt: at, fulfillment: c.brief.fulfillment.kind === "none" ? "not_needed" : "pending",
        }));
        return { ...next, posts: [...next.posts, ...postsFor(a, c, at)] };
      }
      // Declines on an active campaign queue a comparable replacement for the brand to approve.
      const declined = patchAct(s, actId, (x) => ({ ...x, status: c.status === "active" ? "replacement_required" : "declined", respondedAt: at, declineReason: reason }));
      if (c.status !== "active") return declined;
      const set = s.sets.find((x) => x.id === a.setId)!;
      const pick = suggestReplacement(set, c, s.activations.filter((x) => x.campaignId === c.id).map((x) => x.creatorId), a.fee);
      const repl = pick && activationFromMatch(set, c, pick.creator.id, { replacementFor: a.id });
      return repl ? { ...declined, activations: [...declined.activations, repl] } : declined;
    });
  },

  confirmReceived(actId: string) {
    setState((s) => patchAct(s, actId, (a) => (a.fulfillment === "pending" || a.fulfillment === "shipped" ? { ...a, fulfillment: "delivered" } : a)));
  },

  submitDraft(postId: string, caption: string) {
    setState((s) => {
      const p = s.posts.find((x) => x.id === postId);
      const c = p && s.campaigns.find((x) => x.id === p.campaignId);
      if (!p || !c) return s;
      const at = nowIso();
      return patchPost(s, postId, (x) => ({
        ...x,
        caption: caption || x.caption,
        submittedAt: at,
        version: x.status === "revision_requested" ? x.version + 1 : x.version,
        // Without required review, creators publish straight after meeting the brief.
        status: c.brief.review.required ? "draft_submitted" : "approved",
        approvedAt: c.brief.review.required ? x.approvedAt : at,
      }));
    });
  },

  publish(postId: string, url: string) {
    setState((s) =>
      patchPost(s, postId, (p) => ({
        ...p, status: "published", publishedAt: nowIso(), url,
        metrics: { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, conversions: 0, conversionValue: 0 },
      }))
    );
  },

  /** Demo only: platform verification normally lands within 48h via the platform API. */
  verifyPost(postId: string) {
    setState((s) => {
      const p = s.posts.find((x) => x.id === postId);
      const a = p && s.activations.find((x) => x.id === p.activationId);
      if (!p || !a || p.status !== "published") return s;
      const perPost = a.estViews[1] / Math.max(1, s.posts.filter((x) => x.activationId === a.id).length);
      const v = Math.round(perPost * (0.85 + (postId.length % 5) * 0.08));
      return patchPost(s, postId, (x) => ({
        ...x, status: "verified", verifiedAt: nowIso(),
        metrics: { views: v, likes: Math.round(v * 0.062), comments: Math.round(v * 0.0042), shares: Math.round(v * 0.0051), clicks: Math.round(v * 0.008), conversions: 0, conversionValue: 0 },
      }));
    });
  },

  resetDemo() {
    setState(() => SEED);
  },
};
