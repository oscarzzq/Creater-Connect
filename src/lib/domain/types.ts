// Domain model: Campaign → Creator Set → Creator Activation → Post.
// Creator-posted organic distribution is the only campaign type; paid-usage
// rights are an optional add-on in the brief.

export type Platform = "tiktok" | "instagram" | "youtube";

export type Objective = "awareness" | "traffic" | "leads" | "sales" | "app";

export type NicheId =
  | "fashion" | "beauty" | "fitness" | "food" | "tech" | "gaming" | "education" | "business" | "finance"
  | "lifestyle" | "home" | "entertainment" | "parenting" | "sports" | "automotive" | "pets" | "other";

/** Stored lifecycle. Active campaigns get a finer display stage from `campaignStage()`. */
export type CampaignStatus = "draft" | "active" | "make_good" | "completed" | "cancelled";

export type CampaignStage =
  | "draft" | "matching" | "awaiting_approval" | "inviting" | "in_production" | "awaiting_review"
  | "publishing" | "live" | "make_good" | "completed" | "cancelled";

export type CtaType = "website" | "promo_code" | "tracked_link" | "link_in_bio" | "app_download" | "signup" | "comment_keyword" | "visit_store";

export interface Brief {
  benefits: string[];
  intendedAudience: string;
  format: "short_video" | "image" | "carousel";
  deliverables: number; // posts per creator
  videoLength: string; // e.g. "30–45s"
  tone: string;
  talkingPoints: string[];
  mandatoryDemo: string;
  requiredMentions: string[];
  prohibited: string[];
  references: string[];
  cta: { type: CtaType; destination: string; measurement: string };
  hooks: string[];
  script: { mode: "freedom" | "required_statements" | "full_script"; text: string };
  review: { required: boolean; revisionRounds: number; turnaroundDays: number };
  rights: { paidUsage: boolean; months: number; channels: string };
  fulfillment: { kind: "ship" | "access" | "none"; details: string; expectedBy?: string };
}

export interface Guarantee {
  minViews: number;
  platforms: Platform[];
  windowDays: number; // measured from each post's publish date
  verification: string;
  remedy: "supplementary_creators" | "extension" | "credit";
}

export interface Campaign {
  id: string;
  businessId: string;
  businessName: string;
  businessLogo: string;
  businessColor: string;
  name: string;
  objective: Objective;
  promoting: { kind: "product" | "service" | "brand"; name: string; description: string; url: string; image: string };
  status: CampaignStatus;
  budget: number; // all-in: creator fees + platform fee
  startDate: string;
  endDate: string;
  allocation: "automatic" | "manual";
  brief: Brief;
  guarantee?: Guarantee;
  makeGood?: { reason: string; remedy: string; addedAt: string };
  createdAt: string;
  launchedAt?: string;
  source: "demo" | "local" | "live";
}

export interface CreatorSet {
  id: string;
  campaignId: string;
  name: string;
  hypothesis: string;
  platforms: Platform[];
  audienceGeo: string[]; // country codes
  creatorGeo: { countries: string[]; required: boolean };
  demographics: { ageMin: number; ageMax: number; gender: "all" | "women" | "men"; languages: string[] };
  niches: NicheId[];
  interests: string[];
  qualification: { minMedianViews: number; followerRange?: [number, number] };
  budget?: number; // manual allocation cap; automatic sets derive from roster
  creatorCount?: [number, number];
}

export interface PlatformStats {
  platform: Platform;
  followers: number;
  medianViews: number; // last 20 organic videos
  p25: number;
  p75: number;
  engagementRate: number; // shown for context only, never a filter
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  photo: string;
  city: string;
  country: string;
  languages: string[];
  niches: NicheId[]; // primary first
  interests: string[];
  bio: string;
  platforms: PlatformStats[];
  audience: {
    verified: boolean;
    femalePct: number;
    ages: Record<"13–17" | "18–24" | "25–34" | "35–44" | "45+", number>;
    topCountries: { code: string; pct: number }[];
    quality: number; // % genuine audience
  };
  pastBrands: string[];
  samples: string[];
  completedCampaigns: number;
  rating: number;
  responseTime: string;
}

export type ActivationStatus =
  | "recommended" | "approved" | "invited" | "accepted" | "declined" | "expired" | "replacement_required" | "removed";

export interface Message {
  id: string;
  from: "creator" | "business";
  text: string;
  at: string;
}

export interface Activation {
  id: string;
  campaignId: string;
  setId: string;
  creatorId: string;
  platform: Platform;
  status: ActivationStatus;
  fee: number; // fixed creator fee (creator payout)
  estViews: [number, number, number]; // low, expected, high for the full deliverable package
  matchScore: number;
  approvedAt?: string;
  invitedAt?: string;
  respondedAt?: string;
  expiresAt?: string;
  declineReason?: string;
  replacementFor?: string; // activation id this one replaces
  supplementary?: boolean; // added at platform expense (make-good)
  fulfillment: "not_needed" | "pending" | "shipped" | "delivered";
  messages: Message[];
}

export type PostStatus = "not_started" | "draft_submitted" | "revision_requested" | "approved" | "published" | "verified";

export interface PostMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
}

export interface Post {
  id: string;
  activationId: string;
  campaignId: string;
  setId: string;
  creatorId: string;
  platform: Platform;
  index: number; // 1-based within the activation
  status: PostStatus;
  thumbnail: string;
  caption: string;
  duration: number;
  hook?: string;
  dueAt: string;
  submittedAt?: string;
  approvedAt?: string;
  publishedAt?: string;
  verifiedAt?: string;
  url?: string;
  version: number;
  revisionNote?: string;
  metrics?: PostMetrics;
}

export interface InboxFlags {
  read: Record<string, boolean>;
  resolved: Record<string, boolean>;
}
