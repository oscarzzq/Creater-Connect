import { creatorById } from "./creators";
import { TODAY, compact, daysBetween, usd } from "./format";
import { OBJECTIVES } from "./labels";
import { PLATFORM_FEE_RATE, withPlatformFee } from "./matching";
import type { Activation, Campaign, CampaignStage, CreatorSet, InboxFlags, Objective, Post, PostStatus } from "./types";

// Everything on screen derives from activations + posts so numbers reconcile.

export interface World {
  campaigns: Campaign[];
  sets: CreatorSet[];
  activations: Activation[];
  posts: Post[];
  inbox: InboxFlags;
}

export const LIVE: PostStatus[] = ["published", "verified"];
export const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

// ---------------------------------------------------------------------------
// Payments: creators are paid their fixed fee once every post is verified.

export type PaymentState = "not_due" | "processing" | "paid";

export function payment(act: Activation, posts: Post[]): { state: PaymentState; paidAt?: string } {
  if (act.status !== "accepted") return { state: "not_due" };
  const mine = posts.filter((p) => p.activationId === act.id);
  if (mine.length && mine.every((p) => p.status === "verified")) {
    return { state: "paid", paidAt: mine.map((p) => p.verifiedAt!).sort().at(-1) };
  }
  if (mine.some((p) => LIVE.includes(p.status))) return { state: "processing" };
  return { state: "not_due" };
}

// ---------------------------------------------------------------------------
// Stage

export function campaignStage(c: Campaign, acts: Activation[], posts: Post[]): CampaignStage {
  if (c.status === "draft") return acts.some((a) => a.campaignId === c.id) ? "awaiting_approval" : "matching";
  if (c.status === "cancelled" || c.status === "completed" || c.status === "make_good") return c.status;
  const mine = acts.filter((a) => a.campaignId === c.id);
  const ps = posts.filter((p) => p.campaignId === c.id);
  if (ps.some((p) => LIVE.includes(p.status))) return "live";
  if (ps.some((p) => p.status === "draft_submitted")) return "awaiting_review";
  if (ps.some((p) => p.status === "approved")) return "publishing";
  const accepted = mine.filter((a) => a.status === "accepted").length;
  const invited = mine.filter((a) => a.status === "invited").length;
  if (accepted && accepted >= invited) return "in_production";
  if (invited) return "inviting";
  return "awaiting_approval";
}

// ---------------------------------------------------------------------------
// Results

export function resultsOf(objective: Objective, posts: Post[]) {
  const live = posts.filter((p) => p.metrics);
  switch (objective) {
    case "awareness":
      return sum(live.filter((p) => p.status === "verified").map((p) => p.metrics!.views));
    case "traffic":
      return sum(live.map((p) => p.metrics!.clicks));
    default:
      return sum(live.map((p) => p.metrics!.conversions));
  }
}

/** Verified = views confirmed via platform API; attributed = clicks/codes, indirect. */
export function resultKind(objective: Objective): "verified" | "attributed" {
  return objective === "awareness" ? "verified" : "attributed";
}

// ---------------------------------------------------------------------------
// Rollups shared by campaign, creator set and post reporting

export interface Rollup {
  budget: number;
  committed: number; // accepted fees incl. platform fee
  reserved: number; // invited/approved, not yet accepted
  proposed: number; // recommended, awaiting your approval
  spent: number; // paid fees incl. platform fee
  available: number;
  creators: { recommended: number; approved: number; invited: number; accepted: number; declined: number; replacement: number; supplementary: number };
  posts: Record<PostStatus, number> & { total: number };
  views: number; // verified organic views
  pendingViews: number; // published, still verifying
  estViews: [number, number, number]; // accepted + invited packages
  results: number;
  costPerResult: number | null;
  ecpm: number | null;
  clicks: number;
  conversions: number;
  conversionValue: number;
  guarantee: number | null;
  delivery: number | null; // verified views / guarantee
}

const POST_STATUSES: PostStatus[] = ["not_started", "draft_submitted", "revision_requested", "approved", "published", "verified"];

export function rollup(objective: Objective, acts: Activation[], posts: Post[], budget: number, guarantee: number | null): Rollup {
  const paying = acts.filter((a) => !a.supplementary);
  const accepted = paying.filter((a) => a.status === "accepted");
  const spent = withPlatformFee(sum(accepted.filter((a) => payment(a, posts).state === "paid").map((a) => a.fee)));
  const committed = withPlatformFee(sum(accepted.map((a) => a.fee)));
  const reserved = withPlatformFee(sum(paying.filter((a) => a.status === "invited" || a.status === "approved").map((a) => a.fee)));
  const proposed = withPlatformFee(sum(paying.filter((a) => a.status === "recommended").map((a) => a.fee)));
  const verified = posts.filter((p) => p.status === "verified" && p.metrics);
  const views = sum(verified.map((p) => p.metrics!.views));
  const live = posts.filter((p) => p.metrics);
  const results = resultsOf(objective, posts);
  const estActs = acts.filter((a) => a.status === "accepted" || a.status === "invited");
  const counts = Object.fromEntries(POST_STATUSES.map((s) => [s, posts.filter((p) => p.status === s).length])) as Record<PostStatus, number>;
  return {
    budget,
    committed,
    reserved,
    proposed,
    spent,
    available: budget - committed - reserved,
    creators: {
      recommended: acts.filter((a) => a.status === "recommended").length,
      approved: acts.filter((a) => a.status === "approved").length,
      invited: acts.filter((a) => a.status === "invited").length,
      accepted: acts.filter((a) => a.status === "accepted").length,
      declined: acts.filter((a) => a.status === "declined" || a.status === "expired").length,
      replacement: acts.filter((a) => a.status === "replacement_required").length,
      supplementary: acts.filter((a) => a.supplementary).length,
    },
    posts: { ...counts, total: posts.length },
    views,
    pendingViews: sum(posts.filter((p) => p.status === "published" && p.metrics).map((p) => p.metrics!.views)),
    estViews: [0, 1, 2].map((i) => sum(estActs.map((a) => a.estViews[i]))) as [number, number, number],
    results,
    costPerResult: results ? spent / results : null,
    ecpm: views ? (spent / views) * 1000 : null,
    clicks: sum(live.map((p) => p.metrics!.clicks)),
    conversions: sum(live.map((p) => p.metrics!.conversions)),
    conversionValue: sum(live.map((p) => p.metrics!.conversionValue)),
    guarantee,
    delivery: guarantee ? views / guarantee : null,
  };
}

export function campaignRollup(c: Campaign, w: Pick<World, "activations" | "posts">) {
  return rollup(
    c.objective,
    w.activations.filter((a) => a.campaignId === c.id),
    w.posts.filter((p) => p.campaignId === c.id),
    c.budget,
    c.guarantee?.minViews ?? null
  );
}

export function setRollup(s: CreatorSet, c: Campaign, w: Pick<World, "activations" | "posts">) {
  const acts = w.activations.filter((a) => a.setId === s.id);
  const committedOrPlanned = withPlatformFee(sum(acts.filter((a) => ["accepted", "invited", "approved", "recommended"].includes(a.status) && !a.supplementary).map((a) => a.fee)));
  return rollup(c.objective, acts, w.posts.filter((p) => p.setId === s.id), s.budget ?? committedOrPlanned, null);
}

/** Expected total verified views: delivered + expected from posts not yet verified + open invitations. */
export function projectedViews(c: Campaign, w: Pick<World, "activations" | "posts">) {
  const acts = w.activations.filter((a) => a.campaignId === c.id && a.status === "accepted");
  const invited = w.activations.filter((a) => a.campaignId === c.id && a.status === "invited" && !a.supplementary);
  return sum(invited.map((a) => a.estViews[1] * 0.85)) + sum(
    acts.map((a) => {
      const ps = w.posts.filter((p) => p.activationId === a.id);
      const perPost = a.estViews[1] / Math.max(1, ps.length);
      return sum(ps.map((p) => (p.status === "verified" ? p.metrics!.views : p.status === "published" ? Math.max(p.metrics!.views, perPost * 0.8) : perPost * 0.85)));
    })
  );
}

// ---------------------------------------------------------------------------
// Time series

export function dayKeys(days: number, end = TODAY) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return keys;
}

const dayKey = (iso: string) => iso.slice(0, 10);

/** Views accrue on a decay curve after publishing, normalised so the total on TODAY equals tracked views. */
export function dailyViews(posts: Post[], keys: string[]) {
  const totals: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const p of posts) {
    if (!p.publishedAt || !p.metrics) continue;
    const age = Math.max(0, daysBetween(p.publishedAt, TODAY));
    const f = (t: number) => (t < 0 ? 0 : 1 - Math.exp(-(t + 1) / 3));
    const norm = f(age) || 1;
    for (let t = 0; t <= age; t++) {
      const d: Date = new Date(new Date(p.publishedAt).getTime() + t * 86_400_000);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (k in totals) totals[k] += (p.metrics.views * (f(t) - f(t - 1))) / norm;
    }
  }
  return keys.map((k) => Math.round(totals[k]));
}

export function dailySpend(acts: Activation[], posts: Post[], keys: string[]) {
  const totals: Record<string, number> = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const a of acts) {
    if (a.supplementary) continue;
    const p = payment(a, posts);
    if (p.state === "paid" && p.paidAt && dayKey(p.paidAt) in totals) totals[dayKey(p.paidAt)] += a.fee * (1 + PLATFORM_FEE_RATE);
  }
  return keys.map((k) => Math.round(totals[k]));
}

export function dailyResults(objective: Objective, posts: Post[], keys: string[]) {
  if (objective === "awareness") return dailyViews(posts.filter((p) => p.status === "verified"), keys);
  // Clicks and conversions follow the same decay as views.
  const ratio = (p: Post) => (p.metrics ? (objective === "traffic" ? p.metrics.clicks : p.metrics.conversions) / Math.max(1, p.metrics.views) : 0);
  const byPost = posts.filter((p) => p.metrics).map((p) => dailyViews([p], keys).map((v) => v * ratio(p)));
  return keys.map((_, i) => Math.round(sum(byPost.map((s) => s[i]))));
}

export function cumulative(values: number[]) {
  let acc = 0;
  return values.map((v) => (acc += v));
}

// ---------------------------------------------------------------------------
// Inbox

export type InboxCategory = "offers" | "content" | "messages" | "updates";

export interface InboxItem {
  id: string;
  category: InboxCategory;
  needsAction: boolean;
  kind:
    | "review_recommendations" | "replacement" | "accepted" | "declined" | "invited" | "draft" | "revision" | "published" | "verified"
    | "message" | "guarantee_risk" | "make_good" | "completed" | "paid";
  title: string;
  body: string;
  at: string;
  campaignId: string;
  setId?: string;
  activationId?: string;
  postId?: string;
  creatorId?: string;
}

export function inboxItems(w: World, businessId: string): InboxItem[] {
  const own = w.campaigns.filter((c) => c.businessId === businessId);
  const items: InboxItem[] = [];
  const name = (id: string) => creatorById(id)?.name ?? "A creator";
  const first = (id: string) => name(id).split(" ")[0];

  for (const c of own) {
    const acts = w.activations.filter((a) => a.campaignId === c.id);
    const ps = w.posts.filter((p) => p.campaignId === c.id);

    if (c.status === "draft") {
      const recs = acts.filter((a) => a.status === "recommended");
      if (recs.length)
        items.push({
          id: `recs-${c.id}`, category: "offers", needsAction: true, kind: "review_recommendations",
          title: `${recs.length} recommended creators ready for review`, body: `${c.name} · approve the roster, then launch`, at: c.createdAt, campaignId: c.id,
        });
    }

    for (const a of acts) {
      const base = { campaignId: c.id, setId: a.setId, activationId: a.id, creatorId: a.creatorId };
      if (a.status === "recommended" && a.replacementFor) {
        const old = acts.find((x) => x.id === a.replacementFor);
        items.push({
          ...base, id: `repl-${a.id}`, category: "offers", needsAction: true, kind: "replacement",
          title: `${old ? first(old.creatorId) : "A creator"} declined · replacement ready`,
          body: `${name(a.creatorId)} · ${usd(a.fee)} · ~${compact(a.estViews[1])} views · ${c.name}`, at: old?.respondedAt ?? c.createdAt,
        });
      }
      if (a.status === "accepted" && a.respondedAt && !a.supplementary)
        items.push({ ...base, id: `acc-${a.id}`, category: "offers", needsAction: false, kind: "accepted", title: `${name(a.creatorId)} accepted your offer`, body: `${usd(a.fee)} · ${c.name}`, at: a.respondedAt });
      if ((a.status === "declined" || a.status === "replacement_required") && a.respondedAt && !acts.some((x) => x.replacementFor === a.id && x.status === "recommended"))
        items.push({ ...base, id: `dec-${a.id}`, category: "offers", needsAction: false, kind: "declined", title: `${name(a.creatorId)} declined`, body: `${a.declineReason ?? "No reason given"} · ${c.name}`, at: a.respondedAt });
      if (a.status === "invited" && a.invitedAt)
        items.push({ ...base, id: `inv-${a.id}`, category: "offers", needsAction: false, kind: "invited", title: `Offer sent to ${name(a.creatorId)}`, body: `Expires ${a.expiresAt ? daysLeftLabel(a.expiresAt) : ""} · ${c.name}`, at: a.invitedAt });
      const last = a.messages.at(-1);
      if (last)
        items.push({
          ...base, id: `msg-${a.id}-${a.messages.length}`, category: "messages", needsAction: last.from === "creator", kind: "message",
          title: last.from === "creator" ? `${name(a.creatorId)} sent a message` : `You replied to ${name(a.creatorId)}`, body: last.text, at: last.at,
        });
      if (a.supplementary && a.respondedAt)
        items.push({ ...base, id: `supp-${a.id}`, category: "updates", needsAction: false, kind: "make_good", title: `${name(a.creatorId)} joined as a make-good creator`, body: `Covered by your delivery guarantee · ${c.name}`, at: a.respondedAt });
      const pay = payment(a, w.posts);
      if (pay.state === "paid" && pay.paidAt && !a.supplementary)
        items.push({ ...base, id: `paid-${a.id}`, category: "updates", needsAction: false, kind: "paid", title: `Paid ${name(a.creatorId)} ${usd(a.fee)}`, body: `All posts verified · ${c.name}`, at: pay.paidAt });
    }

    for (const p of ps) {
      const base = { campaignId: c.id, setId: p.setId, activationId: p.activationId, postId: p.id, creatorId: p.creatorId };
      const label = ps.filter((x) => x.activationId === p.activationId).length > 1 ? `post ${p.index}` : "post";
      if (p.status === "draft_submitted")
        items.push({ ...base, id: `draft-${p.id}-v${p.version}`, category: "content", needsAction: true, kind: "draft", title: `${first(p.creatorId)} submitted a draft for review`, body: `${p.caption || label} · ${c.name}`, at: p.submittedAt! });
      if (p.status === "revision_requested")
        items.push({ ...base, id: `rev-${p.id}-v${p.version}`, category: "content", needsAction: false, kind: "revision", title: `Revision requested from ${first(p.creatorId)}`, body: p.revisionNote ?? c.name, at: p.submittedAt ?? c.createdAt });
      if (p.publishedAt)
        items.push({ ...base, id: `pub-${p.id}`, category: "updates", needsAction: false, kind: "published", title: `${first(p.creatorId)}'s ${label} is live`, body: `${p.caption} · ${c.name}`, at: p.publishedAt });
      if (p.verifiedAt && p.metrics)
        items.push({ ...base, id: `ver-${p.id}`, category: "updates", needsAction: false, kind: "verified", title: `${first(p.creatorId)}'s ${label} verified · ${compact(p.metrics.views)} views`, body: c.name, at: p.verifiedAt });
    }

    if (c.guarantee?.minViews && c.status === "active") {
      const projected = projectedViews(c, w);
      if (projected < c.guarantee.minViews)
        items.push({
          id: `risk-${c.id}`, category: "updates", needsAction: true, kind: "guarantee_risk", campaignId: c.id,
          title: "Delivery guarantee at risk", body: `Projected ${compact(projected)} of ${compact(c.guarantee.minViews)} guaranteed views · ${c.name}`, at: TODAY.toISOString().slice(0, 19),
        });
    }
    if (c.makeGood)
      items.push({ id: `mg-${c.id}`, category: "updates", needsAction: false, kind: "make_good", campaignId: c.id, title: "Make-good started", body: `${c.makeGood.remedy} · ${c.name}`, at: c.makeGood.addedAt });
    if (c.status === "completed") {
      const r = campaignRollup(c, w);
      items.push({
        id: `done-${c.id}`, category: "updates", needsAction: false, kind: "completed", campaignId: c.id, title: `${c.name} completed`,
        body: `${compact(r.views)} verified views${r.guarantee ? ` · ${Math.round((r.delivery ?? 0) * 100)}% of guarantee` : ""}`, at: c.endDate,
      });
    }
  }
  return items
    .filter((i) => daysBetween(i.at, TODAY) >= 0)
    .map((i) => (i.needsAction && w.inbox.resolved[i.id] ? { ...i, needsAction: false } : i))
    .sort((a, b) => Number(b.needsAction) - Number(a.needsAction) || b.at.localeCompare(a.at));
}

function daysLeftLabel(iso: string) {
  const d = daysBetween(TODAY, iso);
  return d < 0 ? "passed" : d === 0 ? "today" : `in ${d}d`;
}

export function objectiveResultLabel(o: Objective) {
  return OBJECTIVES[o].resultPlural;
}
