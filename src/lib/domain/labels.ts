import type { ActivationStatus, CampaignStage, CtaType, NicheId, Objective, PostStatus } from "./types";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

export const NICHES: { id: NicheId; label: string }[] = [
  { id: "ai", label: "AI & Machine Learning" },
  { id: "devtools", label: "Developer Tools" },
  { id: "cloud", label: "Cloud & Infrastructure" },
  { id: "security", label: "Cybersecurity" },
  { id: "data", label: "Data & Analytics" },
  { id: "saas", label: "Enterprise SaaS" },
  { id: "fintech", label: "Fintech" },
  { id: "product", label: "Product & Design" },
  { id: "webdev", label: "Web Development" },
  { id: "leadership", label: "Engineering Leadership" },
  { id: "startups", label: "Startups & Founders" },
  { id: "careers", label: "Tech Careers & Education" },
  { id: "other", label: "Other" },
];

export const NICHE_LABEL = Object.fromEntries(NICHES.map((n) => [n.id, n.label])) as Record<NicheId, string>;

/** The objective sets the primary reporting metric. Guarantees are always on organic views. */
export const OBJECTIVES: Record<Objective, { label: string; description: string; result: string; resultPlural: string; tracking: string }> = {
  awareness: { label: "Awareness", description: "Reach the right professional audience with verified organic views.", result: "view", resultPlural: "Views", tracking: "Verified organic views" },
  traffic: { label: "Website traffic", description: "Drive tracked visits to your site, docs or landing page.", result: "visit", resultPlural: "Visits", tracking: "Tracked link clicks (UTM)" },
  leads: { label: "Leads", description: "Generate signups, trials or demo requests.", result: "lead", resultPlural: "Leads", tracking: "Form submissions via tracked link" },
  sales: { label: "Sales", description: "Generate attributed purchases or paid upgrades.", result: "purchase", resultPlural: "Purchases", tracking: "Promo code + tracked link purchases" },
  app: { label: "App promotion", description: "Drive tracked app or extension installs.", result: "install", resultPlural: "Installs", tracking: "Install attribution link" },
};

export const CTAS: Record<CtaType, string> = {
  website: "Visit website",
  promo_code: "Use promo code",
  tracked_link: "Click tracked / affiliate link",
  link_in_bio: "Visit link in bio",
  app_download: "Download the app",
  signup: "Register / sign up",
  comment_keyword: "Comment a keyword",
  visit_store: "Visit a store",
};

export const STAGES: Record<CampaignStage, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  matching: { label: "Matching", tone: "neutral" },
  awaiting_approval: { label: "Matches pairing", tone: "warning" },
  inviting: { label: "Inviting creators", tone: "brand" },
  in_production: { label: "In production", tone: "brand" },
  awaiting_review: { label: "Awaiting content review", tone: "warning" },
  publishing: { label: "Publishing", tone: "brand" },
  live: { label: "Live · measuring", tone: "success" },
  make_good: { label: "Make-good in progress", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

export const ACTIVATION_STATUS: Record<ActivationStatus, { label: string; tone: Tone; owner: string }> = {
  recommended: { label: "Matched · pairing", tone: "neutral", owner: "You: decline within 24h, or it pairs automatically" },
  approved: { label: "Approved", tone: "brand", owner: "Sent at launch" },
  invited: { label: "Invited", tone: "brand", owner: "Creator: accept or decline" },
  accepted: { label: "Accepted", tone: "success", owner: "Creator: producing" },
  declined: { label: "Declined", tone: "danger", owner: "—" },
  expired: { label: "Expired", tone: "neutral", owner: "—" },
  replacement_required: { label: "Replacement required", tone: "warning", owner: "You: approve a replacement" },
  removed: { label: "Removed", tone: "neutral", owner: "—" },
};

export const POST_STATUS: Record<PostStatus, { label: string; tone: Tone; owner: string }> = {
  not_started: { label: "In production", tone: "neutral", owner: "Creator" },
  draft_submitted: { label: "Needs review", tone: "warning", owner: "You" },
  revision_requested: { label: "Revision requested", tone: "danger", owner: "Creator" },
  approved: { label: "Ready to publish", tone: "brand", owner: "Creator" },
  published: { label: "Published · verifying", tone: "brand", owner: "Platform" },
  verified: { label: "Live · verified", tone: "success", owner: "Platform" },
};

export const REMEDIES = {
  supplementary_creators: "Supplementary creators at our expense",
  extension: "Extend the delivery window",
  credit: "Fee credit for the shortfall",
} as const;
