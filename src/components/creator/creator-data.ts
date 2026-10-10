"use client";

import { useMemo } from "react";
import { PLATFORMS } from "@/components/platform-icon";
import { useAppState } from "@/lib/store";
import { CTAS, type Tone } from "@/lib/domain/labels";
import { daysBetween, daysFromToday, shortDate, TODAY } from "@/lib/domain/format";
import { payment, sum } from "@/lib/domain/metrics";
import type { Activation, Brief, Campaign, CreatorSet, Platform, Post, PostStatus } from "@/lib/domain/types";

// Creator-side derivations. Everything comes from the shared store so the
// numbers a creator sees reconcile with the business side. Creators only ever
// see their own fixed fee (activation.fee), never the platform fee or budget.

export type InboxTab = "new" | "active" | "completed" | "declined";

/** Statuses a creator can see. recommended / approved / removed never reached them. */
const VISIBLE = new Set<Activation["status"]>(["invited", "accepted", "declined", "replacement_required", "expired"]);

export interface CreatorItem {
  activation: Activation;
  campaign: Campaign;
  set: CreatorSet | undefined;
  posts: Post[];
  /** Effective status: invites past their expiry read as expired even before the store sweeps them. */
  status: "invited" | "accepted" | "declined" | "expired";
  tab: InboxTab;
  paidAt?: string;
  phase: Phase;
  /** Posts or receipt confirmations waiting on the creator. */
  todo: number;
}

export type Phase =
  | "offer" | "closed" | "receive" | "create" | "revise" | "in_review" | "publish" | "verifying" | "paid";

export function effectiveStatus(a: Activation): CreatorItem["status"] {
  if (a.status === "invited") return a.expiresAt && daysBetween(TODAY, a.expiresAt) < 0 ? "expired" : "invited";
  if (a.status === "replacement_required" || a.status === "declined") return "declined";
  if (a.status === "expired") return "expired";
  return "accepted";
}

export function needsReceipt(a: Activation, c: Campaign) {
  return c.brief.fulfillment.kind !== "none" && (a.fulfillment === "pending" || a.fulfillment === "shipped");
}

/** A post the creator needs to act on next. */
export function postNeedsCreator(p: Post) {
  return p.status === "not_started" || p.status === "revision_requested" || p.status === "approved";
}

export function phaseOf(a: Activation, c: Campaign, posts: Post[]): Phase {
  const s = effectiveStatus(a);
  if (s === "invited") return "offer";
  if (s !== "accepted") return "closed";
  if (payment(a, posts).state === "paid") return "paid";
  if (needsReceipt(a, c)) return "receive";
  const has = (st: PostStatus) => posts.some((p) => p.status === st);
  if (has("revision_requested")) return "revise";
  if (has("not_started")) return "create";
  if (has("approved")) return "publish";
  if (has("draft_submitted")) return "in_review";
  return "verifying";
}

export const PHASE: Record<Phase, { label: string; tone: Tone }> = {
  offer: { label: "New offer", tone: "brand" },
  closed: { label: "Declined", tone: "neutral" },
  receive: { label: "Waiting for product", tone: "neutral" },
  create: { label: "In production", tone: "brand" },
  revise: { label: "Changes requested", tone: "danger" },
  in_review: { label: "In review", tone: "warning" },
  publish: { label: "Ready to post", tone: "warning" },
  verifying: { label: "Verifying", tone: "brand" },
  paid: { label: "Paid", tone: "success" },
};

export function statusFor(item: Pick<CreatorItem, "status" | "phase">): { label: string; tone: Tone } {
  if (item.status === "declined") return { label: "Declined", tone: "danger" };
  if (item.status === "expired") return { label: "Expired", tone: "neutral" };
  return PHASE[item.phase];
}

/** Post status in the creator's words (POST_STATUS is written for the brand). */
export const CREATOR_POST_STATUS: Record<PostStatus, { label: string; tone: Tone }> = {
  not_started: { label: "To do", tone: "neutral" },
  draft_submitted: { label: "In review", tone: "warning" },
  revision_requested: { label: "Changes requested", tone: "danger" },
  approved: { label: "Ready to post", tone: "brand" },
  published: { label: "Published · verifying", tone: "brand" },
  verified: { label: "Verified", tone: "success" },
};

const lastActivity = (a: Activation) => a.messages.at(-1)?.at ?? a.respondedAt ?? a.invitedAt ?? "";

export function useCreatorItems(creatorId: string) {
  const { campaigns, sets, activations, posts } = useAppState();
  return useMemo(() => {
    const byId = new Map(campaigns.map((c) => [c.id, c]));
    const items: CreatorItem[] = activations
      .filter((a) => a.creatorId === creatorId && VISIBLE.has(a.status))
      .flatMap((activation) => {
        const campaign = byId.get(activation.campaignId);
        if (!campaign) return [];
        const mine = posts.filter((p) => p.activationId === activation.id).sort((x, y) => x.index - y.index);
        const status = effectiveStatus(activation);
        const pay = payment(activation, mine);
        const phase = phaseOf(activation, campaign, mine);
        const tab: InboxTab = status === "invited" ? "new" : status === "accepted" ? (pay.state === "paid" ? "completed" : "active") : "declined";
        const todo = status === "accepted" ? (needsReceipt(activation, campaign) ? 1 : mine.filter(postNeedsCreator).length) : 0;
        return [{ activation, campaign, set: sets.find((s) => s.id === activation.setId), posts: mine, status, tab, paidAt: pay.paidAt, phase, todo }];
      })
      .sort((a, b) => lastActivity(b.activation).localeCompare(lastActivity(a.activation)));

    const tabs: Record<InboxTab, CreatorItem[]> = { new: [], active: [], completed: [], declined: [] };
    for (const i of items) tabs[i.tab].push(i);
    tabs.new.sort((a, b) => (a.activation.expiresAt ?? "").localeCompare(b.activation.expiresAt ?? ""));
    tabs.active.sort((a, b) => Number(b.todo > 0) - Number(a.todo > 0) || nextDue(a).localeCompare(nextDue(b)));
    tabs.completed.sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));

    const fee = (xs: CreatorItem[]) => sum(xs.map((i) => i.activation.fee));
    const verifying = tabs.active.filter((i) => i.phase === "verifying");
    return {
      items,
      tabs,
      todo: sum(tabs.active.map((i) => i.todo)),
      totals: {
        paid: fee(tabs.completed),
        upcoming: fee(tabs.active),
        verifying: fee(verifying),
        inProduction: fee(tabs.active) - fee(verifying),
        open: tabs.new.length,
        openValue: fee(tabs.new),
      },
    };
  }, [campaigns, sets, activations, posts, creatorId]);
}

function nextDue(i: CreatorItem) {
  return i.posts.filter(postNeedsCreator).map((p) => p.dueAt).sort()[0] ?? "9999";
}

// ---------------------------------------------------------------------------
// Brief → creator-facing copy

const FORMAT_NOUN: Record<Brief["format"], [string, string]> = {
  short_video: ["video", "videos"],
  image: ["image post", "image posts"],
  carousel: ["carousel", "carousels"],
};

/** "2 Reels", "1 TikTok video", "1 YouTube Short". */
export function deliverablesLabel(brief: Brief, platform: Platform) {
  const n = brief.deliverables;
  if (brief.format === "short_video") {
    const f = PLATFORMS[platform].format;
    return `${n} ${f}${n === 1 ? "" : "s"}`;
  }
  return `${n} ${PLATFORMS[platform].short} ${FORMAT_NOUN[brief.format][n === 1 ? 0 : 1]}`;
}

export function ctaLabel(brief: Brief) {
  return CTAS[brief.cta.type];
}

export const SCRIPT_MODE: Record<Brief["script"]["mode"], string> = {
  freedom: "Your own words. No script.",
  required_statements: "Your own words, plus a few required lines.",
  full_script: "Full script provided by the brand.",
};

export function rightsText(brief: Brief, brand: string) {
  if (!brief.rights.paidUsage) return { title: "Organic only", body: `Your post stays on your account. ${brand} gets no rights to run it as a paid ad.` };
  return {
    title: `Paid usage · ${brief.rights.months} months`,
    body: `${brand} may run your post as an ad for ${brief.rights.months} months on ${brief.rights.channels || "its paid channels"}. Included in your fee.`,
  };
}

export function fulfillmentText(brief: Brief) {
  const f = brief.fulfillment;
  if (f.kind === "ship") return { title: "Product shipped to you", body: f.details || "Shipped after you accept." };
  if (f.kind === "access") return { title: "Access provided", body: f.details || "Access details are sent after you accept." };
  return { title: "Nothing to ship", body: f.details || "No product or access needed for this one." };
}

export function reviewText(brief: Brief, brand: string) {
  if (!brief.review.required) return { title: "No draft approval", body: "Publish once your content meets the brief." };
  const rounds = brief.review.revisionRounds;
  return {
    title: "Draft approval required",
    body: `${brand} reviews your draft${brief.review.turnaroundDays ? ` within ${brief.review.turnaroundDays} ${brief.review.turnaroundDays === 1 ? "day" : "days"}` : ""}${rounds ? ` · up to ${rounds} revision ${rounds === 1 ? "round" : "rounds"}` : ""}.`,
  };
}

/** Mirrors the store: first post due 14 days after accepting, later ones 21 days, capped at campaign end. */
export function dueIfAcceptedToday(campaign: Campaign, index = 1) {
  return [daysFromToday(index === 1 ? 14 : 21, "23:59"), campaign.endDate].sort()[0];
}

export function deadlineText(item: Pick<CreatorItem, "status" | "posts" | "campaign">) {
  if (item.status === "accepted" && item.posts.length) {
    const open = item.posts.filter((p) => p.status !== "published" && p.status !== "verified");
    if (!open.length) return "All posts published";
    return `Post by ${shortDate(open.map((p) => p.dueAt).sort()[0])}`;
  }
  return `Post within 14 days of accepting, by ${shortDate(item.campaign.endDate)} at the latest`;
}

// ---------------------------------------------------------------------------
// Dates

export function expiryLabel(expiresAt: string | undefined) {
  if (!expiresAt) return "Open";
  const d = daysBetween(TODAY, expiresAt);
  if (d < 0) return "Expired";
  if (d === 0) return "Expires today";
  if (d === 1) return "Expires tomorrow";
  return `Expires in ${d}d`;
}

export function isUrgent(expiresAt: string | undefined) {
  return !!expiresAt && daysBetween(TODAY, expiresAt) <= 2;
}

/** "Due Oct 14 · in 6d", "Due today", "2d overdue" */
export function dueLabel(iso: string) {
  const d = daysBetween(TODAY, iso);
  if (d < 0) return `Due ${shortDate(iso)} · ${-d}d overdue`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${shortDate(iso)} · in ${d}d`;
}

// ---------------------------------------------------------------------------
// Match copy

/** The match summary is written for the brand; say it to the creator. Pricing lines are dropped. */
export function whyYou(summary: string) {
  const out = summary
    .split(/(?<=\.)\s+/)
    .filter((s) => s && !/per 1,000 expected views/.test(s))
    .map((s) =>
      s
        .replace(/^(\d+% women and \d+% aged)/, "Your audience is $1")
        .replace(/^Already makes content about/, "You already make content about")
        .replace(/^[A-Z][\w'-]* is an? (.+) creator\.$/, "You're a $1 creator.")
        .replace(/^Reliable reach: /, "Your reach is reliable: ")
        .replace(/^(\d+)% genuine audience\.$/, "$1% of your audience is genuine.")
        .replace(/^Meets every requirement for this creator set\.$/, "You meet every requirement for this campaign.")
        .replace(/in your regions/, "in their target regions")
    );
  return out.join(" ") || "You meet every requirement for this campaign.";
}

// ---------------------------------------------------------------------------
// Post links

const URL_RULES: Record<Platform, { re: RegExp; example: string }> = {
  tiktok: { re: /^https?:\/\/((www|vm|m)\.)?tiktok\.com\/\S+/i, example: "https://www.tiktok.com/@you/video/123…" },
  instagram: { re: /^https?:\/\/(www\.)?instagram\.com\/(reel|reels|p)\/[\w-]+/i, example: "https://www.instagram.com/reel/Abc123…" },
  youtube: { re: /^https?:\/\/((www|m)\.)?(youtube\.com\/(shorts\/|watch\?v=)|youtu\.be\/)[\w-]+/i, example: "https://youtube.com/shorts/Abc123…" },
};

export function urlExample(platform: Platform) {
  return URL_RULES[platform].example;
}

export function normalizeUrl(raw: string) {
  const t = raw.trim();
  return t && !/^https?:\/\//i.test(t) ? `https://${t}` : t;
}

/** Returns an error message, or null when the link looks like a post on the right platform. */
export function validatePostUrl(raw: string, platform: Platform): string | null {
  const url = normalizeUrl(raw);
  if (!url) return "Paste the link to your published post.";
  if (URL_RULES[platform].re.test(url)) return null;
  const other = (Object.keys(URL_RULES) as Platform[]).find((p) => p !== platform && URL_RULES[p].re.test(url));
  if (other) return `That link is from ${PLATFORMS[other].label}, but this deliverable is on ${PLATFORMS[platform].label}.`;
  return `That doesn't look like a post link from ${PLATFORMS[platform].label}.`;
}
