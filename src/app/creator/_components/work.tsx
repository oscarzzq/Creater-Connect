"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Briefcase, ChevronRight, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Photo } from "@/components/app/photo";
import { EmptyState } from "@/components/app/section";
import { StatusPill } from "@/components/app/status-badge";
import { BrandMark } from "@/components/creator/brand-mark";
import { useCurrentCreator } from "@/components/creator/creator-context";
import { deliverablesLabel, statusFor, useCreatorItems, type CreatorItem } from "@/components/creator/creator-data";
import { PayoutGuarantee, PostRow, ReceiveBanner, usePostDialogs } from "@/components/creator/post-row";
import { useAppState } from "@/lib/store";
import { shortDate, usd } from "@/lib/domain/format";
import { sum } from "@/lib/domain/metrics";
import { cn } from "@/lib/utils";

interface BrandGroup {
  businessId: string;
  items: CreatorItem[];
  todo: number;
}

function groupByBrand(items: CreatorItem[]): BrandGroup[] {
  const map = new Map<string, CreatorItem[]>();
  for (const i of items) map.set(i.campaign.businessId, [...(map.get(i.campaign.businessId) ?? []), i]);
  return [...map.entries()]
    .map(([businessId, xs]) => ({ businessId, items: xs, todo: sum(xs.map((x) => x.todo)) }))
    .sort((a, b) => Number(b.todo > 0) - Number(a.todo > 0));
}

export function Work() {
  const creator = useCurrentCreator();
  const { campaigns } = useAppState();
  const d = useCreatorItems(creator.id);
  const dialogs = usePostDialogs(campaigns);

  const { active, done, counts } = useMemo(() => {
    const posts = d.tabs.active.flatMap((i) => i.posts);
    return {
      active: groupByBrand(d.tabs.active),
      done: groupByBrand(d.tabs.completed),
      counts: {
        receive: d.tabs.active.filter((i) => i.phase === "receive").length,
        todo: posts.filter((p) => p.status === "not_started").length,
        changes: posts.filter((p) => p.status === "revision_requested").length,
        toPost: posts.filter((p) => p.status === "approved").length,
        review: posts.filter((p) => p.status === "draft_submitted").length,
        verifying: posts.filter((p) => p.status === "published").length,
      },
    };
  }, [d.tabs]);

  const summary = [
    counts.changes && `${counts.changes} with changes requested`,
    counts.toPost && `${counts.toPost} ready to post`,
    counts.todo && `${counts.todo} to create`,
    counts.receive && `${counts.receive} waiting for product`,
    counts.review && `${counts.review} in review`,
    counts.verifying && `${counts.verifying} verifying`,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Your work</h1>
        <p className="mt-1 text-sm text-muted-foreground">{summary.length ? summary.join(" · ") : "Nothing waiting on you right now"}</p>
      </header>

      {active.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No deliverables yet"
          description="Accept an offer and its posts show up here with due dates, brand feedback and the next step for each."
          action={
            <Button asChild variant="outline">
              <Link href="/creator">
                Browse your offers
                <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 ? (
            <div className="space-y-6">
              {active.map((g) => (
                <BrandSection key={g.businessId} group={g} dialogs={dialogs} />
              ))}
              <PayoutGuarantee className="px-1" />
            </div>
          ) : (
            <EmptyState icon={CircleCheck} title="All caught up" description="Every campaign you're on is delivered and paid. New work appears here when you accept an offer." />
          )}

          {done.length > 0 && (
            <section className="space-y-3" aria-labelledby="paid-h">
              <h2 id="paid-h" className="text-[15px] font-semibold tracking-tight">
                Paid &amp; wrapped
              </h2>
              {done.map((g) => (
                <BrandSection key={g.businessId} group={g} dialogs={dialogs} compact />
              ))}
            </section>
          )}
        </>
      )}
      {dialogs.dialogs}
    </div>
  );
}

function BrandSection({ group, dialogs, compact = false }: { group: BrandGroup; dialogs: ReturnType<typeof usePostDialogs>; compact?: boolean }) {
  const c0 = group.items[0].campaign;
  const total = sum(group.items.map((i) => i.activation.fee));
  return (
    <section className="space-y-2" aria-label={c0.businessName}>
      <div className="flex items-center gap-2 px-1">
        <BrandMark campaign={c0} size="sm" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{c0.businessName}</h2>
        {group.todo > 0 && <span className="rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary tabular-nums">{group.todo} to do</span>}
        {group.items.length > 1 && <span className="text-xs text-muted-foreground tabular-nums">{usd(total)} total</span>}
      </div>
      {group.items.map((item) => (
        <CampaignCard key={item.activation.id} item={item} dialogs={dialogs} compact={compact} />
      ))}
    </section>
  );
}

function CampaignCard({ item, dialogs, compact }: { item: CreatorItem; dialogs: ReturnType<typeof usePostDialogs>; compact: boolean }) {
  const { activation: a, campaign: c, posts } = item;
  const status = statusFor(item);
  const live = posts.filter((p) => p.status === "published" || p.status === "verified").length;

  return (
    <div className="surface overflow-hidden">
      <Link href={`/creator/offers/${a.id}`} className="flex items-center gap-3 border-b p-4 transition-colors outline-none hover:bg-muted/40 focus-visible:bg-muted/60">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Photo src={c.promoting.image} alt="" sizes="88px" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{c.name}</div>
          <div className="mt-0.5 flex min-w-0 items-center gap-2">
            <StatusPill tone={status.tone}>{status.label}</StatusPill>
            <span className="truncate text-xs text-muted-foreground">
              {c.promoting.name} · {deliverablesLabel(c.brief, a.platform)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold tracking-tight tabular-nums">{usd(a.fee)}</div>
          <div className={cn("text-[11px]", item.paidAt ? "text-success-text" : "text-muted-foreground")}>
            {item.paidAt ? `Paid ${shortDate(item.paidAt)}` : `${live}/${posts.length} published`}
          </div>
        </div>
        <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
      </Link>
      {!compact && <ReceiveBanner activation={a} campaign={c} className="m-4 mb-0" />}
      <ul className="divide-y">
        {posts.map((p) => (
          <PostRow key={p.id} post={p} activation={a} campaign={c} total={posts.length} onSubmit={dialogs.onSubmit} onPublish={dialogs.onPublish} />
        ))}
        {posts.length === 0 && <li className="p-4 text-sm text-muted-foreground">Posts are being set up.</li>}
      </ul>
    </div>
  );
}
