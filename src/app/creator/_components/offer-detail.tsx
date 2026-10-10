"use client";

import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CalendarClock,
  Check,
  Clock,
  Eye,
  FileCheck2,
  HandCoins,
  Lightbulb,
  MessageCircleQuestion,
  Package,
  SearchX,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORMS, PlatformTile } from "@/components/platform-icon";
import { Photo } from "@/components/app/photo";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { EmptyState } from "@/components/app/section";
import { MatchRing, factorBarTone } from "@/components/app/match-breakdown";
import { DataTag, StatusPill } from "@/components/app/status-badge";
import { BrandMark } from "@/components/creator/brand-mark";
import { setCreatorId, useCurrentCreator } from "@/components/creator/creator-context";
import {
  SCRIPT_MODE,
  ctaLabel,
  deadlineText,
  deliverablesLabel,
  dueIfAcceptedToday,
  expiryLabel,
  fulfillmentText,
  reviewText,
  rightsText,
  statusFor,
  useCreatorItems,
  whyYou,
  type CreatorItem,
} from "@/components/creator/creator-data";
import { MessageThread } from "@/components/creator/message-thread";
import { OfferActions } from "@/components/creator/offer-actions";
import { matchFor } from "@/components/creator/offer-cards";
import { PayoutGuarantee, PostRow, ReceiveBanner, usePostDialogs } from "@/components/creator/post-row";
import { StepTracker, productionSteps } from "@/components/creator/step-tracker";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, relative, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES } from "@/lib/domain/labels";
import { cn } from "@/lib/utils";

export function OfferDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const viewing = useCurrentCreator();
  const { activations, campaigns } = useAppState();
  const activation = activations.find((a) => a.id === id);
  // Read through the owning creator's items so status, phase and payment match the inbox.
  const owner = activation?.creatorId ?? viewing.id;
  const { items } = useCreatorItems(owner);
  const item = items.find((i) => i.activation.id === id);
  const creator = creatorById(owner);
  const dialogs = usePostDialogs(campaigns);

  if (!item || !creator) {
    return (
      <EmptyState
        icon={SearchX}
        title="Offer not found"
        description="It may have been withdrawn, or the demo data was reset."
        action={
          <Button asChild variant="outline">
            <Link href="/creator">Back to inbox</Link>
          </Button>
        }
      />
    );
  }

  const { activation: a, campaign: c } = item;
  const accepted = item.status === "accepted";
  const payout = <PayoutCard item={item} />;

  return (
    <div className="space-y-5">
      <Link href="/creator" className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        <ArrowLeft className="size-4" />
        Inbox
      </Link>

      {creator.id !== viewing.id && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed bg-card px-4 py-3 text-sm">
          <CreatorPhoto creator={creator} size={28} />
          <span className="min-w-0 flex-1">
            This offer was sent to <span className="font-medium">{creator.name}</span>. You&apos;re viewing as {viewing.name}.
          </span>
          <Button size="sm" variant="outline" onClick={() => setCreatorId(creator.id)}>
            View as {creator.name.split(" ")[0]}
          </Button>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_320px] md:items-start lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Hero */}
          <section className="surface overflow-hidden">
            <div className="relative aspect-[16/9] bg-muted sm:aspect-[2/1]">
              <Photo src={c.promoting.image} alt={c.promoting.name} sizes="(min-width: 768px) 620px, 100vw" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute inset-x-4 bottom-4 flex items-end gap-3 text-white sm:inset-x-5 sm:bottom-5">
                <BrandMark campaign={c} size="lg" className="ring-2 ring-white/20" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/85">{c.businessName}</div>
                  <h1 className="text-xl leading-tight font-semibold tracking-tight sm:text-2xl">{c.promoting.name}</h1>
                </div>
              </div>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap gap-1.5">
                <Chip>{c.name}</Chip>
                <Chip>{OBJECTIVES[c.objective].label} campaign</Chip>
                <Chip>{PLATFORMS[a.platform].label}</Chip>
              </div>
              {c.promoting.description && <p className="text-[15px] leading-relaxed text-foreground/85">{c.promoting.description}</p>}
              {c.brief.benefits.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {c.brief.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-1.5">
                      <Check className="size-3.5 text-success" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="md:hidden">{payout}</div>

          {accepted && (
            <section className="surface" aria-labelledby="progress-h">
              <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
                <h2 id="progress-h" className="text-sm font-semibold">
                  Your progress
                </h2>
                <Link href="/creator/work" className="rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
                  All work
                </Link>
              </div>
              <StepTracker steps={productionSteps(item)} className="px-4 pt-3 pb-4 sm:px-5" />
              <ReceiveBanner activation={a} campaign={c} className="mx-4 mb-4 sm:mx-5" />
              {item.posts.length > 0 && (
                <ul className="divide-y border-t">
                  {item.posts.map((p) => (
                    <PostRow key={p.id} post={p} activation={a} campaign={c} total={item.posts.length} onSubmit={dialogs.onSubmit} onPublish={dialogs.onPublish} />
                  ))}
                </ul>
              )}
            </section>
          )}

          <Deliverables item={item} />
          <CreativeBrief item={item} />
          <Terms item={item} />
          <WhyYou item={item} />
        </div>

        <aside className="space-y-4 md:sticky md:top-20">
          <div className="hidden md:block">{payout}</div>
          <section id="messages" className="surface scroll-mt-20 p-4" aria-labelledby="messages-h">
            <h2 id="messages-h" className="flex items-center gap-1.5 text-sm font-semibold">
              <MessageCircleQuestion className="size-4 text-muted-foreground" />
              {item.status === "invited" || accepted ? "Ask a question or report an issue" : "Messages"}
            </h2>
            <MessageThread activation={a} campaign={c} readOnly={!(item.status === "invited" || accepted)} className="mt-3" />
          </section>
        </aside>
      </div>
      {dialogs.dialogs}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-6 items-center rounded-md border px-2 text-xs text-muted-foreground">{children}</span>;
}

// ---------------------------------------------------------------------------

function PayoutCard({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c } = item;
  const status = statusFor(item);
  const closed = item.status === "declined" || item.status === "expired";

  return (
    <section className="surface p-4 sm:p-5" aria-label="Payout">
      <div className="flex items-center justify-between gap-2">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {item.status === "invited" && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {expiryLabel(a.expiresAt)}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className={cn("text-4xl font-semibold tracking-tight tabular-nums", closed && "text-muted-foreground line-through decoration-2")}>{usd(a.fee)}</div>
        <div className="mt-1 text-sm text-muted-foreground">Fixed payout for {deliverablesLabel(c.brief, a.platform)}</div>
      </div>

      {!closed && (
        <div className="mt-4 space-y-2.5 rounded-lg bg-muted/70 p-3 text-[13px]">
          <div className="flex gap-2.5">
            <HandCoins className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {item.paidAt ? (
              <span className="font-medium text-success-text">Paid {shortDate(item.paidAt)}</span>
            ) : item.phase === "verifying" ? (
              <span>All posts are live. You&apos;re paid as soon as verification finishes (up to 48h).</span>
            ) : (
              <span>Paid once every post is published and verified.</span>
            )}
          </div>
          <PayoutGuarantee />
        </div>
      )}

      {!closed && !item.paidAt && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="size-3.5" />
          Brands expect ~{compact(a.estViews[1])} views
          <DataTag kind="estimate" />
        </p>
      )}

      <div className="mt-4">
        {item.status === "invited" ? (
          <OfferActions item={item} size="xl" stacked />
        ) : isAccepted(item) ? (
          item.paidAt ? null : (
            <Button asChild className="h-11 w-full rounded-xl">
              <Link href="/creator/work">
                {item.todo > 0 ? `${item.todo} to do in Work` : "Open Work"}
                <ArrowRight />
              </Link>
            </Button>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {item.status === "expired" ? "This offer expired before you replied." : a.declineReason ? `You declined: ${a.declineReason}` : "You declined this offer."}
          </p>
        )}
      </div>
    </section>
  );
}

const isAccepted = (i: CreatorItem) => i.status === "accepted";

// ---------------------------------------------------------------------------

function Deliverables({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c } = item;
  const b = c.brief;
  const rows = [
    { label: "Deliverables", value: `${deliverablesLabel(b, a.platform)} · ${b.videoLength}` },
    { label: "Publishing", value: item.status === "invited" ? `By ${shortDate(dueIfAcceptedToday(c))} if you accept today${b.deliverables > 1 ? ` · later posts by ${shortDate(dueIfAcceptedToday(c, 2))}` : ""}` : deadlineText(item) },
    { label: "Call to action", value: `${ctaLabel(b)}${b.cta.destination ? `: ${b.cta.destination}` : ""}` },
    { label: "Campaign ends", value: `${shortDate(c.endDate)} · ${relative(c.endDate)}` },
  ];
  return (
    <section className="surface" aria-labelledby="deliver-h">
      <div className="flex items-center gap-3 px-4 pt-4 sm:px-5">
        <PlatformTile platform={a.platform} />
        <div>
          <h2 id="deliver-h" className="text-sm font-semibold">
            What you&apos;ll deliver
          </h2>
          <p className="text-xs text-muted-foreground">Posted organically from your {PLATFORMS[a.platform].label} account</p>
        </div>
      </div>
      <dl className="mt-3 divide-y border-t">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4 sm:px-5">
            <dt className="w-32 shrink-0 text-xs text-muted-foreground sm:pt-0.5">{r.label}</dt>
            <dd className="text-sm">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function CreativeBrief({ item }: { item: CreatorItem }) {
  const b = item.campaign.brief;
  const must = [b.mandatoryDemo && `Show: ${b.mandatoryDemo}`, ...b.requiredMentions.map((m) => `Mention ${m}`)].filter(Boolean) as string[];
  return (
    <section className="surface space-y-4 p-4 sm:p-5" aria-labelledby="brief-h">
      <div>
        <h2 id="brief-h" className="text-sm font-semibold">
          Creative brief
        </h2>
        {b.tone && <p className="mt-1 text-sm text-muted-foreground">{b.tone}</p>}
      </div>

      {item.activation.notes && (
        <div className="rounded-lg border border-primary/20 bg-brand-subtle/50 p-3 text-sm">
          <div className="mb-0.5 text-xs font-medium text-brand-subtle-foreground">Just for you from {item.campaign.businessName}</div>
          {item.activation.notes}
        </div>
      )}

      {b.talkingPoints.length > 0 && (
        <BriefList title="Talking points" items={b.talkingPoints} icon={<span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {must.length > 0 && (
          <BriefList
            title="Must include"
            items={must}
            icon={
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-text">
                <Check className="size-3" aria-label="Required" />
              </span>
            }
          />
        )}
        {b.prohibited.length > 0 && (
          <BriefList
            title="Avoid"
            items={b.prohibited}
            icon={
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive-subtle text-destructive-text">
                <Ban className="size-2.5" aria-label="Not allowed" />
              </span>
            }
          />
        )}
      </div>

      <div className="rounded-lg border p-3">
        <div className="text-xs font-medium text-muted-foreground">Script</div>
        <p className="mt-0.5 text-sm">{SCRIPT_MODE[b.script.mode]}</p>
        {b.script.text && <p className="mt-1.5 rounded-md bg-muted/70 px-2.5 py-1.5 text-sm text-foreground/85">{b.script.text}</p>}
      </div>

      {b.hooks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Lightbulb className="size-3.5" />
            Hook ideas · optional, use your own if you prefer
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {b.hooks.map((h) => (
              <li key={h} className="rounded-lg border border-dashed px-2.5 py-1 text-[13px] text-foreground/85">
                “{h}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function BriefList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      <ul className="mt-1.5 space-y-1.5 text-sm">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            {icon}
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Terms({ item }: { item: CreatorItem }) {
  const { activation: a, campaign: c } = item;
  const review = reviewText(c.brief, c.businessName);
  const rights = rightsText(c.brief, c.businessName);
  const ship = fulfillmentText(c.brief);
  const terms = [
    { icon: FileCheck2, ...review },
    { icon: ShieldCheck, ...rights },
    { icon: Package, ...ship, body: `${ship.body}${c.brief.fulfillment.expectedBy ? ` Expected by ${shortDate(c.brief.fulfillment.expectedBy)}.` : ""}` },
    {
      icon: CalendarClock,
      title: "Offer expiration",
      body:
        item.status === "invited" && a.expiresAt
          ? `Reply by ${shortDate(a.expiresAt)} (${relative(a.expiresAt)}). After that the offer closes.`
          : a.respondedAt
            ? `You replied ${shortDate(a.respondedAt)}.`
            : a.expiresAt
              ? `Closed ${shortDate(a.expiresAt)}.`
              : "No expiry.",
    },
  ];
  return (
    <section className="surface p-4 sm:p-5" aria-labelledby="terms-h">
      <h2 id="terms-h" className="text-sm font-semibold">
        Terms
      </h2>
      <ul className="mt-3 grid gap-4 sm:grid-cols-2">
        {terms.map((t) => (
          <li key={t.title} className="flex gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <t.icon className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 text-sm">
              <div className="font-medium">{t.title}</div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CREATOR_FACTOR_LABEL: Record<string, string> = {
  audience: "Audience fit",
  relevance: "Content relevance",
  performance: "Organic views",
  quality: "Audience quality",
};

function WhyYou({ item }: { item: CreatorItem }) {
  const match = matchFor(item);
  if (!match) return null;
  // Cost efficiency is priced for the brand (incl. platform fee), so it isn't shown to creators.
  const factors = match.factors.filter((f) => f.key !== "efficiency");
  return (
    <section className="surface p-4 sm:p-5" aria-labelledby="why-h">
      <div className="flex items-start gap-3">
        <MatchRing score={match.score} size={52} label="Match score" />
        <div className="min-w-0">
          <h2 id="why-h" className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-3.5 text-primary" />
            Why you
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-foreground/85">{whyYou(match.summary)}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {factors.map((f) => (
          <div key={f.key}>
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-medium">{CREATOR_FACTOR_LABEL[f.key] ?? f.label}</span>
              <span className="text-muted-foreground tabular-nums">{f.score}/100</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn("h-full rounded-full", factorBarTone(f.score))} style={{ width: `${f.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{f.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
