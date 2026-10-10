"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-badge";
import { formatMoney } from "@/lib/types";
import type { LiveOffer } from "./use-live-offers";

/** Offers from Supabase for a signed-in creator, answered via the server action. */
export function LiveOffersSection({
  name,
  offers,
  respond,
}: {
  name?: string;
  offers: LiveOffer[];
  respond: (id: string, status: "accepted" | "rejected") => Promise<{ error?: string }>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function act(o: LiveOffer, status: "accepted" | "rejected") {
    setBusy(o.id);
    const res = await respond(o.id, status);
    setBusy(null);
    if (res.error) toast.error("Couldn't update offer", { description: res.error });
    else toast.success(status === "accepted" ? "Offer accepted" : "Offer declined", { description: o.campaign?.title });
  }

  return (
    <section aria-labelledby="live-offers" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 id="live-offers" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
            Live offers
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success-text">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Realtime
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">Signed in{name ? ` as ${name}` : ""}. These come from your account, not the demo.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {offers.map((o) => (
          <li key={o.id} className="surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{o.campaign?.title ?? "Campaign"}</div>
                {o.campaign?.brief && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{o.campaign.brief}</p>}
                <div className="mt-2 text-xs text-muted-foreground tabular-nums">Match score {o.match_score}</div>
              </div>
              <div className="shrink-0 text-2xl font-semibold tracking-tight tabular-nums">{formatMoney(o.payout_cents)}</div>
            </div>
            {o.status === "pending" ? (
              <div className="mt-3 flex gap-2">
                <Button className="h-10 flex-1 rounded-xl" disabled={busy === o.id} onClick={() => act(o, "accepted")}>
                  <Check />
                  Accept
                </Button>
                <Button variant="outline" className="h-10 rounded-xl" disabled={busy === o.id} onClick={() => act(o, "rejected")}>
                  <X />
                  Decline
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                <StatusPill tone={o.status === "accepted" ? "success" : "neutral"}>{o.status === "accepted" ? "Accepted · brand notified" : "Declined"}</StatusPill>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
