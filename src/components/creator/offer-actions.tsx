"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, FileCheck2, MessageCircleQuestion, Package, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { actions } from "@/lib/store";
import { shortDate, usd } from "@/lib/domain/format";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand-mark";
import { deliverablesLabel, dueIfAcceptedToday, fulfillmentText, reviewText, rightsText, type CreatorItem } from "./creator-data";
import { AskDialog } from "./message-thread";

/** Accept / Decline / Ask for an open offer. Fixed price: there is no counteroffer. */
export function OfferActions({
  item,
  size = "lg",
  stacked = false,
  className,
}: {
  item: CreatorItem;
  size?: "lg" | "xl";
  /** Accept on its own row, Decline and Ask below (for narrow columns). */
  stacked?: boolean;
  className?: string;
}) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const h = size === "xl" ? "h-12 text-base" : "h-11";
  const name = item.campaign.name;
  const fee = usd(item.activation.fee);

  return (
    <>
      <div className={cn(stacked ? "grid grid-cols-2 gap-2" : "flex gap-2", className)}>
        <Button className={cn(h, "flex-1 rounded-xl", stacked && "col-span-2")} onClick={() => setAcceptOpen(true)} aria-label={`Accept ${fee} offer for ${name}`}>
          <Check />
          Accept {fee}
        </Button>
        <Button
          variant="outline"
          className={cn(h, "rounded-xl px-3.5 text-muted-foreground hover:text-destructive-text")}
          onClick={() => setDeclineOpen(true)}
          aria-label={`Decline offer for ${name}`}
        >
          <X />
          <span className={cn(!stacked && "max-[400px]:sr-only")}>Decline</span>
        </Button>
        <Button variant="outline" className={cn(h, "rounded-xl px-3.5")} onClick={() => setAskOpen(true)} aria-label={`Ask ${item.campaign.businessName} a question about ${name}`}>
          <MessageCircleQuestion />
          <span className={cn(!stacked && "max-[400px]:sr-only")}>Ask</span>
          {item.activation.messages.length > 0 && (
            <span className="rounded bg-muted px-1 text-[11px] font-semibold text-muted-foreground tabular-nums">{item.activation.messages.length}</span>
          )}
        </Button>
      </div>
      <AcceptDialog item={item} open={acceptOpen} onOpenChange={setAcceptOpen} />
      <DeclineDialog item={item} open={declineOpen} onOpenChange={setDeclineOpen} />
      <AskDialog activation={item.activation} campaign={item.campaign} open={askOpen} onOpenChange={setAskOpen} />
    </>
  );
}

// ---------------------------------------------------------------------------

export function AcceptDialog({ item, open, onOpenChange }: { item: CreatorItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const { activation: a, campaign: c } = item;
  const brief = c.brief;
  const rights = rightsText(brief, c.businessName);
  const ship = fulfillmentText(brief);
  const review = reviewText(brief, c.businessName);
  const due = dueIfAcceptedToday(c);

  function accept() {
    actions.respond(a.id, "accepted");
    onOpenChange(false);
    toast.success(`You're on ${c.businessName}'s campaign`, {
      description: `${usd(a.fee)} · ${deliverablesLabel(brief, a.platform)} added to Work`,
      action: { label: "Open Work", onClick: () => router.push("/creator/work") },
    });
  }

  const rows = [
    { icon: FileCheck2, title: deliverablesLabel(brief, a.platform), body: `${brief.videoLength} · posted organically from your account` },
    { icon: CalendarClock, title: `Post by ${shortDate(due)}`, body: brief.deliverables > 1 ? `Later posts by ${shortDate(dueIfAcceptedToday(c, 2))}` : "14 days from today, within the campaign" },
    { icon: Package, title: ship.title, body: ship.body },
    { icon: ShieldCheck, title: rights.title, body: `${rights.body} ${review.title}.` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <BrandMark campaign={c} size="md" />
            <div className="min-w-0">
              <DialogTitle>Accept for {usd(a.fee)}?</DialogTitle>
              <DialogDescription className="truncate">
                {c.businessName} · {c.promoting.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <r.icon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 text-sm">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">{r.body}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="rounded-lg bg-success-subtle/70 px-3 py-2 text-xs text-success-text">
          Your full {usd(a.fee)} is paid once your posts are verified, even if views come in lower than expected.
        </p>
        <DialogFooter>
          <Button variant="outline" className="h-10" onClick={() => onOpenChange(false)}>
            Not yet
          </Button>
          <Button className="h-10" onClick={accept}>
            <Check />
            Accept offer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------

const REASONS = ["Fully booked", "Not a fit for my audience", "Timeline doesn't work", "Fee too low", "Don't use this kind of product"];

export function DeclineDialog({ item, open, onOpenChange }: { item: CreatorItem; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <DeclineForm item={item} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function DeclineForm({ item, onDone }: { item: CreatorItem; onDone: () => void }) {
  const { activation: a, campaign: c } = item;
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function decline() {
    const text = [reason, note.trim()].filter(Boolean).join(". ") || undefined;
    actions.respond(a.id, "declined", text);
    toast(`Declined ${c.businessName}`, { description: text ? `Reason shared: "${text}"` : "The brand has been notified." });
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Decline this offer?</DialogTitle>
        <DialogDescription>
          {usd(a.fee)} from {c.businessName} for {c.name}. A reason is optional, but it helps us send you better-fitting offers.
        </DialogDescription>
      </DialogHeader>
      <div role="group" aria-label="Reason (optional)" className="flex flex-wrap gap-2">
        {REASONS.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={reason === r}
            onClick={() => setReason(reason === r ? null : r)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              reason === r && "border-foreground bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {reason === r && <Check className="size-3.5" />}
            {r}
          </button>
        ))}
      </div>
      <Textarea aria-label="Add a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note (optional)" className="resize-none" />
      <DialogFooter>
        <Button variant="outline" className="h-10" onClick={onDone}>
          Keep offer
        </Button>
        <Button variant="destructive" className="h-10" onClick={decline}>
          <X />
          Decline offer
        </Button>
      </DialogFooter>
    </>
  );
}
