"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Ban, Briefcase, CircleCheck, Inbox as InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/app/section";
import { useCurrentCreator } from "@/components/creator/creator-context";
import { useCreatorItems, type CreatorItem, type InboxTab } from "@/components/creator/creator-data";
import { NewOfferCard, OfferRow } from "@/components/creator/offer-cards";
import { LiveOffersSection } from "@/components/creator/live-offers";
import { useLiveOffers } from "@/components/creator/use-live-offers";
import { TODAY, usd } from "@/lib/domain/format";
import { cn } from "@/lib/utils";

const TODAY_LABEL = TODAY.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

const TABS: { key: InboxTab; label: string }[] = [
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
];

export function Inbox() {
  const creator = useCurrentCreator();
  const d = useCreatorItems(creator.id);
  const live = useLiveOffers();
  const [tab, setTab] = useState<InboxTab>("new");
  const first = creator.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{TODAY_LABEL}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Hi {first}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.totals.open > 0 ? (
            <>
              <span className="font-medium text-foreground">
                {d.totals.open} new {d.totals.open === 1 ? "offer" : "offers"} worth {usd(d.totals.openValue)}
              </span>{" "}
              waiting for your reply
            </>
          ) : (
            "No new offers waiting on you"
          )}
          {d.todo > 0 && (
            <>
              {" · "}
              <Link href="/creator/work" className="rounded font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
                {d.todo} {d.todo === 1 ? "thing" : "things"} to do in Work
              </Link>
            </>
          )}
        </p>
      </header>

      {live.live && live.offers.length > 0 && <LiveOffersSection name={live.profile?.name} offers={live.offers} respond={live.respond} />}

      <EarningsStrip paid={d.totals.paid} upcoming={d.totals.upcoming} verifying={d.totals.verifying} open={d.totals.open} openValue={d.totals.openValue} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as InboxTab)} className="gap-4">
        <TabsList className="grid h-10! w-full grid-cols-4 sm:inline-flex sm:w-fit">
          {TABS.map((t) => {
            const n = d.tabs[t.key].length;
            return (
              <TabsTrigger key={t.key} value={t.key} className="px-1 text-[13px] sm:px-3">
                {t.label}
                {n > 0 && (
                  <span className={cn("rounded px-1 text-[11px] font-semibold tabular-nums", t.key === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{n}</span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="new">
          {d.tabs.new.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {d.tabs.new.map((item) => (
                <NewOfferCard key={item.activation.id} item={item} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={InboxIcon}
              title="You're all caught up"
              description="New offers land here the moment a brand matches with you. Keep your connected accounts and profile current to show up in more campaigns."
              action={
                <Button asChild variant="outline">
                  <Link href="/creator/onboarding">
                    Update your profile
                    <ArrowRight />
                  </Link>
                </Button>
              }
            />
          )}
        </TabsContent>

        <TabsContent value="active">
          {d.tabs.active.length ? (
            <RowList items={d.tabs.active} footer={
              <Button asChild variant="ghost" className="mt-1 h-9 text-muted-foreground">
                <Link href="/creator/work">
                  Go to your work
                  <ArrowRight />
                </Link>
              </Button>
            } />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No active campaigns"
              description="When you accept an offer it moves here until you're paid."
              action={
                d.tabs.new.length > 0 ? (
                  <Button variant="outline" onClick={() => setTab("new")}>
                    See {d.tabs.new.length} new {d.tabs.new.length === 1 ? "offer" : "offers"}
                  </Button>
                ) : undefined
              }
            />
          )}
        </TabsContent>

        <TabsContent value="completed">
          {d.tabs.completed.length ? (
            <RowList items={d.tabs.completed} />
          ) : (
            <EmptyState icon={CircleCheck} title="Nothing completed yet" description="Campaigns you've been paid for show up here with their verified views." />
          )}
        </TabsContent>

        <TabsContent value="declined">
          {d.tabs.declined.length ? (
            <RowList items={d.tabs.declined} />
          ) : (
            <EmptyState icon={Ban} title="No declined offers" description="Offers you turn down, or that expire before you reply, are kept here." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RowList({ items, footer }: { items: CreatorItem[]; footer?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <OfferRow key={item.activation.id} item={item} />
      ))}
      {footer}
    </div>
  );
}

function EarningsStrip({ paid, upcoming, verifying, open, openValue }: { paid: number; upcoming: number; verifying: number; open: number; openValue: number }) {
  const tiles = [
    { label: "Paid out", value: usd(paid), sub: "all time" },
    { label: "Upcoming payouts", value: usd(upcoming), sub: verifying ? `${usd(verifying)} verifying` : "accepted, not yet paid" },
    { label: "Open offers", value: String(open), sub: open ? `${usd(openValue)} on the table` : "none waiting" },
  ];
  return (
    <Link
      href="/creator/earnings"
      aria-label={`Earnings: ${usd(paid)} paid out, ${usd(upcoming)} upcoming, ${open} open offers`}
      className="surface grid grid-cols-3 divide-x overflow-hidden transition-shadow outline-none hover:shadow-float focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 px-3 py-3 sm:px-5 sm:py-4">
          <div className="truncate text-[11px] font-medium text-muted-foreground sm:text-[13px]">{t.label}</div>
          <div className="mt-1 text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">{t.value}</div>
          <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{t.sub}</div>
        </div>
      ))}
    </Link>
  );
}
