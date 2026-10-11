"use client";

import { useSyncExternalStore } from "react";
import { creatorById } from "./domain/creators";
import { TODAY, daysBetween } from "./domain/format";
import { briefFor, matchCreator, matchSet, recommendRoster, suggestReplacement, withPlatformFee } from "./domain/matching";
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

/** True once persisted demo data has loaded on the client (false during SSR and hydration). */
export function useStoreReady(): boolean {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
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

function postsFor(a: Activation, c: Campaign, set: CreatorSet | undefined, at: string): Post[] {
  const creator = creatorById(a.creatorId);
  const due = [plusDays(at, 14, true), c.endDate].sort()[0];
  return Array.from({ length: briefFor(c, set).deliverables }, (_, i) => ({
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

/**
 * A creator leaves the roster (declined, or excluded by the brand). Automatic sets invite a
 * comparable replacement straight away; manual sets queue one for the brand to approve.
 */
function replaceCreator(s: AppState, a: Activation, c: Campaign, reason: "declined" | "excluded", at: string, note?: string): AppState {
  const set = s.sets.find((x) => x.id === a.setId);
  const auto = set?.selection === "automatic";
  let next = patchAct(s, a.id, (x) =>
    reason === "excluded"
      ? { ...x, status: "removed" }
      : { ...x, status: c.status === "active" && !auto ? "replacement_required" : "declined", respondedAt: at, declineReason: note }
  );
  if (reason === "excluded" && set) next = { ...next, sets: next.sets.map((x) => (x.id === set.id ? { ...x, excludeCreators: [...new Set([...x.excludeCreators, a.creatorId])] } : x)) };
  if (c.status !== "active" || !set) return next;
  const fresh = next.sets.find((x) => x.id === set.id)!;
  const pick = suggestReplacement(fresh, c, next.activations.filter((x) => x.campaignId === c.id).map((x) => x.creatorId), a.fee);
  const repl = pick && activationFromMatch(fresh, c, pick.creator.id, { replacementFor: a.id });
  if (!repl) return next;
  return { ...next, activations: [...next.activations, auto ? invite(repl, at) : repl] };
}

/** Matching runs at publish: automatic sets invite their roster, manual sets get recommendations to approve. */
function rosterFor(s: AppState, c: Campaign, set: CreatorSet, budget: number, at: string): Activation[] {
  const taken = s.activations.filter((a) => a.campaignId === c.id && a.status !== "removed").map((a) => a.creatorId);
  return recommendRoster(set, c, budget, taken)
    .map((m) => activationFromMatch(set, c, m.creator.id))
    .filter((a): a is Activation => !!a)
    .map((a) => (set.selection === "automatic" ? invite(a, at) : a));
}

function setBudgetOf(c: Campaign, sets: CreatorSet[], set: CreatorSet) {
  return c.allocation === "manual" && set.budget ? set.budget : Math.round(c.budget / Math.max(1, sets.length));
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

  /** Publish a draft: approved creators are invited; sets without a roster get matched now. */
  launch(campaignId: string) {
    const at = nowIso();
    setState((s) => {
      const c = s.campaigns.find((x) => x.id === campaignId);
      if (!c) return s;
      const live = { ...c, status: "active" as const, launchedAt: at };
      let next: AppState = {
        ...s,
        campaigns: s.campaigns.map((x) => (x.id === campaignId ? live : x)),
        activations: s.activations.map((a) => (a.campaignId === campaignId && a.status === "approved" ? invite(a, at) : a)),
      };
      const sets = next.sets.filter((x) => x.campaignId === campaignId);
      for (const set of sets) {
        if (next.activations.some((a) => a.setId === set.id && a.status !== "removed")) continue;
        next = { ...next, activations: [...next.activations, ...rosterFor(next, live, set, setBudgetOf(live, sets, set), at)] };
      }
      // Guarantee floor is set from the creators actually invited.
      const invited = next.activations.filter((a) => a.campaignId === campaignId && (a.status === "invited" || a.status === "recommended") && !a.supplementary);
      if (live.guarantee && invited.length >= 3) {
        const floor = Math.floor((invited.reduce((sum, a) => sum + a.estViews[0], 0) * 0.85) / 5000) * 5000;
        next = { ...next, campaigns: next.campaigns.map((x) => (x.id === campaignId ? { ...x, guarantee: { ...x.guarantee!, minViews: floor } } : x)) };
      }
      return next;
    });
  },

  /** Save edits from the campaign editor. New sets without creators are matched right away on live campaigns. */
  applyEdits(campaign: Campaign, sets: CreatorSet[]) {
    const at = nowIso();
    setState((s) => {
      const keepIds = new Set(sets.map((x) => x.id));
      let next: AppState = {
        ...s,
        campaigns: s.campaigns.map((c) => (c.id === campaign.id ? campaign : c)),
        sets: [...s.sets.filter((x) => x.campaignId !== campaign.id), ...sets],
        // Creators in deleted sets who haven't accepted are withdrawn.
        activations: s.activations.map((a) => (a.campaignId === campaign.id && !keepIds.has(a.setId) && a.status !== "accepted" ? { ...a, status: "removed" as const } : a)),
      };
      if (campaign.status === "active") {
        for (const set of sets) {
          if (next.activations.some((a) => a.setId === set.id && a.status !== "removed")) continue;
          next = { ...next, activations: [...next.activations, ...rosterFor(next, campaign, set, setBudgetOf(campaign, sets, set), at)] };
        }
      }
      return next;
    });
  },

  /** Remove a creator who hasn't accepted yet; automatic sets invite a comparable replacement. */
  exclude(actId: string) {
    const at = nowIso();
    setState((s) => {
      const a = s.activations.find((x) => x.id === actId);
      const c = a && s.campaigns.find((x) => x.id === a.campaignId);
      if (!a || !c || a.status === "accepted") return s;
      return replaceCreator(s, a, c, "excluded", at);
    });
  },

  setNotes(actId: string, notes: string) {
    setState((s) => patchAct(s, actId, (a) => ({ ...a, notes })));
  },

  /** Invite more creators into a set until its budget share is used. */
  fillRoster(setId: string) {
    const at = nowIso();
    setState((s) => {
      const set = s.sets.find((x) => x.id === setId);
      const c = set && s.campaigns.find((x) => x.id === set.campaignId);
      if (!set || !c) return s;
      const sets = s.sets.filter((x) => x.campaignId === c.id);
      const used = withPlatformFee(s.activations.filter((a) => a.setId === setId && ["accepted", "invited", "approved", "recommended"].includes(a.status) && !a.supplementary).reduce((sum, a) => sum + a.fee, 0));
      return { ...s, activations: [...s.activations, ...rosterFor(s, c, set, Math.max(0, setBudgetOf(c, sets, set) - used), at)] };
    });
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
        const set = s.sets.find((x) => x.id === a.setId);
        const next = patchAct(s, actId, (x) => ({
          ...x, status: "accepted", respondedAt: at, fulfillment: briefFor(c, set).fulfillment.kind === "none" ? "not_needed" : "pending",
        }));
        return { ...next, posts: [...next.posts, ...postsFor(a, c, set, at)] };
      }
      return replaceCreator(s, a, c, "declined", at, reason);
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
      const review = briefFor(c, s.sets.find((x) => x.id === p.setId)).review.required;
      return patchPost(s, postId, (x) => ({
        ...x,
        caption: caption || x.caption,
        submittedAt: at,
        version: x.status === "revision_requested" ? x.version + 1 : x.version,
        // Without required review, creators publish straight after meeting the brief.
        status: review ? "draft_submitted" : "approved",
        approvedAt: review ? x.approvedAt : at,
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
