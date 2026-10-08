"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_CAMPAIGNS, DEMO_CREATORS } from "@/lib/demo-data";
import { loadDemoOffers, saveDemoOffers } from "@/lib/demo-store";
import { respondToOffer } from "@/app/actions/campaigns";
import { formatMoney, type Campaign, type Offer, type OfferStatus } from "@/lib/types";

interface OfferWithCampaign extends Offer {
  campaign?: Campaign;
}

export default function CreatorInbox() {
  const router = useRouter();
  const [me, setMe] = useState(DEMO_CREATORS[0]);
  const [live, setLive] = useState(false);
  const [offers, setOffers] = useState<OfferWithCampaign[]>(() =>
    loadDemoOffers()
      .filter((o) => o.creator_id === "c1")
      .map((o) => ({
        ...o,
        campaign: DEMO_CAMPAIGNS.find((c) => c.id === o.campaign_id),
      }))
  );

  // Refresh demo offers when returning from the business page (e.g. after sending bids)
  useEffect(() => {
    if (live) return;
    const onFocus = () =>
      setOffers(
        loadDemoOffers()
          .filter((o) => o.creator_id === "c1")
          .map((o) => ({
            ...o,
            campaign: DEMO_CAMPAIGNS.find((c) => c.id === o.campaign_id),
          }))
      );
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [live]);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!profile) return;
        setLive(true);
        setMe(profile as typeof me);

        const { data: off } = await supabase
          .from("offers")
          .select("*, campaign:campaigns(*)")
          .eq("creator_id", user.id)
          .order("created_at", { ascending: false });
        if (off) setOffers(off as unknown as OfferWithCampaign[]);

        // Realtime: new bids + status changes appear live (demo wow-factor)
        const channel = supabase
          .channel(`offers-${user.id}`)
          .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "offers",
            filter: `creator_id=eq.${user.id}`,
          }, async () => {
            const { data: fresh } = await supabase
              .from("offers")
              .select("*, campaign:campaigns(*)")
              .eq("creator_id", user.id)
              .order("created_at", { ascending: false });
            if (fresh) setOffers(fresh as unknown as OfferWithCampaign[]);
          })
          .subscribe();
        return () => { supabase.removeChannel(channel); };
      } catch {
        // demo mode
      }
    })();
  }, []);

  const pending = offers.filter((o) => o.status === "pending");
  const earnings = offers.filter((o) => o.status === "accepted").reduce((s, o) => s + o.payout_cents, 0);

  async function respond(id: string, status: OfferStatus) {
    if (!live) {
      const next = offers.map((o) => (o.id === id ? { ...o, status } : o));
      setOffers(next);
      // persist to shared demo store (strip joined campaign before saving)
      const all = loadDemoOffers().map((o) =>
        o.id === id ? { ...o, status } : o
      );
      saveDemoOffers(all);
      return;
    }
    if (status === "pending") return; // undo only in demo
    const res = await respondToOffer(id, status);
    if (res.error) alert(res.error);
    else setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 font-bold text-white">M</Link>
            <div>
              <p className="font-semibold leading-none">Offer inbox {live ? "" : "(demo)"}</p>
              <p className="text-xs text-zinc-500">{me.name} · {me.niche} · {(me.followers / 1000).toFixed(0)}K followers</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/business" className="rounded-full border px-4 py-2 text-sm hover:bg-zinc-100">Business view</Link>
            <button onClick={handleSignOut} className="rounded-full border px-4 py-2 text-sm hover:bg-zinc-100">Sign out</button>
          </div>
        </div>
      </header>

      {!live && (
        <div className="border-b bg-yellow-50 px-6 py-2 text-center text-xs text-yellow-800">
          Demo mode — <Link href="/login" className="underline">sign up as a creator</Link> + run <code>supabase/schema.sql</code> for live bids with realtime.
        </div>
      )}

      <main className="mx-auto max-w-3xl px-6 py-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-zinc-500">Pending</p><p className="text-2xl font-bold">{pending.length}</p></div>
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-zinc-500">Accepted</p><p className="text-2xl font-bold">{offers.length - pending.length}</p></div>
          <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-zinc-500">Earnings</p><p className="text-2xl font-bold">{formatMoney(earnings)}</p></div>
        </div>

        <h2 className="mb-2 mt-6 font-semibold">Bids for you {live && <span className="text-xs font-normal text-green-600">● live</span>}</h2>
        <div className="space-y-3">
          {offers.map((offer) => (
            <div key={offer.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{offer.campaign?.title ?? "Campaign"}</p>
                  <p className="mt-1 text-sm text-zinc-600">{offer.campaign?.brief}</p>
                </div>
                <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold">{formatMoney(offer.payout_cents)}</span>
              </div>
              <div className="mt-2 text-xs text-zinc-500">Match score {offer.match_score}</div>
              {offer.status === "pending" ? (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => respond(offer.id, "accepted")} className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-500">Accept ✓</button>
                  <button onClick={() => respond(offer.id, "rejected")} className="flex-1 rounded-xl border py-2.5 text-sm hover:bg-zinc-100">Reject</button>
                </div>
              ) : (
                <p className={`mt-4 rounded-xl px-3 py-2 text-sm font-medium ${offer.status === "accepted" ? "bg-green-50 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                  {offer.status === "accepted" ? "Accepted — brand notified ✓" : "Rejected"}
                  {!live && <button onClick={() => respond(offer.id, "pending")} className="ml-2 underline">undo</button>}
                </p>
              )}
            </div>
          ))}
          {offers.length === 0 && <p className="text-sm text-zinc-500">No offers yet — ask a business to send you a bid.</p>}
        </div>
      </main>
    </div>
  );
}
