"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEMO_CAMPAIGNS, DEMO_CREATORS } from "@/lib/demo-data";
import { loadDemoOffers, resetDemoOffers, saveDemoOffers } from "@/lib/demo-store";
import { rankCreators } from "@/lib/matching";
import { sendOffers as sendOffersAction } from "@/app/actions/campaigns";
import { formatFollowers, formatMoney, type Campaign, type Offer, type Profile } from "@/lib/types";

export default function BusinessDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Glow Inc. (demo)");
  const [live, setLive] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [creators, setCreators] = useState<Profile[]>(DEMO_CREATORS);
  const [offers, setOffers] = useState<Offer[]>(() => loadDemoOffers());
  const [selectedId, setSelectedId] = useState(DEMO_CAMPAIGNS[0].id);
  const [sending, setSending] = useState(false);

  // Try live Supabase data; silently fall back to demo on any failure
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        const { data: camps } = await supabase.from("campaigns").select("*").eq("business_id", user.id).order("created_at", { ascending: false });
        const { data: allCreators } = await supabase.from("profiles").select("*").eq("role", "creator").limit(50);
        if (!camps) return; // tables missing → stay in demo
        setLive(true);
        setUserName((profile as { name?: string } | null)?.name ?? user.email ?? "Business");
        if (camps.length > 0) {
          setCampaigns(camps as Campaign[]);
          setSelectedId((camps as Campaign[])[0].id);
          const ids = (camps as Campaign[]).map((c) => c.id);
          const { data: off } = await supabase.from("offers").select("*").in("campaign_id", ids);
          if (off) setOffers(off as Offer[]);
        } else {
          setCampaigns([]);
        }
        if (allCreators && allCreators.length > 0) setCreators(allCreators as Profile[]);
      } catch {
        // demo mode
      }
    })();
  }, []);

  const selected = campaigns.find((c) => c.id === selectedId) ?? campaigns[0];
  const matches = useMemo(
    () => (selected ? rankCreators(creators, selected) : []),
    [selected, creators]
  );
  const offersForSelected = offers.filter((o) => o.campaign_id === selected?.id);
  const accepted = offersForSelected.filter((o) => o.status === "accepted").length;

  async function sendOffers() {
    if (!selected) return;
    if (!live) {
      // Demo mode: actually create the offers locally so the creator inbox receives them
      const existing = new Set(
        offers.filter((o) => o.campaign_id === selected.id).map((o) => o.creator_id)
      );
      const fresh = matches
        .slice(0, 3)
        .filter(({ creator }) => !existing.has(creator.id))
        .map(({ creator, score }, i) => ({
          id: `demo-${selected.id}-${creator.id}-${Date.now()}-${i}`,
          campaign_id: selected.id,
          creator_id: creator.id,
          payout_cents: Math.min(creator.price_cents, selected.max_payout_cents),
          status: "pending" as const,
          match_score: score,
        }));
      if (fresh.length === 0) {
        alert("Top 3 already have offers for this campaign — check the creator inbox ✓");
        return;
      }
      const next = [...offers, ...fresh];
      setOffers(next);
      saveDemoOffers(next);
      alert(`Sent ${fresh.length} demo offers for "${selected.title}" ✓\nOpen Creator view to accept them.`);
      return;
    }
    setSending(true);
    const top = matches.slice(0, 3);
    const payouts: Record<string, number> = {};
    const scores: Record<string, number> = {};
    top.forEach(({ creator, score }) => {
      payouts[creator.id] = Math.min(creator.price_cents, selected.max_payout_cents);
      scores[creator.id] = score;
    });
    const res = await sendOffersAction(selected.id, top.map((t) => t.creator.id), payouts, scores);
    setSending(false);
    if (res.error) alert(res.error);
    else {
      alert(`Sent ${res.sent} offers ✓`);
      router.refresh();
    }
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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">M</Link>
            <div>
              <p className="font-semibold leading-none">Ads Manager {live ? "" : "(demo)"}</p>
              <p className="text-xs text-zinc-500">{userName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/creator" className="rounded-full border px-4 py-2 text-sm hover:bg-zinc-100">Creator view</Link>
            <Link href="/business/campaigns/new" className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">+ New campaign</Link>
            <button onClick={handleSignOut} className="rounded-full border px-4 py-2 text-sm hover:bg-zinc-100">Sign out</button>
          </div>
        </div>
      </header>

      {!live && (
        <div className="border-b bg-yellow-50 px-6 py-2 text-center text-xs text-yellow-800">
          Demo mode — offers are stored in this browser.{" "}
          <button
            onClick={() => {
              resetDemoOffers();
              window.location.reload();
            }}
            className="underline"
          >
            Reset demo
          </button>
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Campaigns</p>
          <div className="space-y-2">
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-xl border p-3 text-left ${c.id === selectedId ? "border-blue-500 bg-blue-50" : "hover:bg-zinc-50"}`}
              >
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-zinc-500">{formatMoney(c.budget_cents)} budget · {c.niche_target}</p>
              </button>
            ))}
            {campaigns.length === 0 && (
              <p className="text-sm text-zinc-500">No campaigns yet. <Link href="/business/campaigns/new" className="text-blue-600 underline">Create one →</Link></p>
            )}
          </div>
          {selected && (
            <div className="mt-4 rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600">
              {offersForSelected.length} offers · {accepted} accepted
            </div>
          )}
        </aside>

        <section className="rounded-2xl border bg-white p-6">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{selected.title}</h1>
                  <p className="mt-1 max-w-2xl text-sm text-zinc-600">{selected.brief}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Target: {selected.niche_target} · min {formatFollowers(selected.min_followers)} followers · max payout {formatMoney(selected.max_payout_cents)}
                  </p>
                </div>
                <button onClick={sendOffers} disabled={sending} className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
                  {sending ? "Sending…" : "Send offers to top 3 →"}
                </button>
              </div>

              <h2 className="mb-2 mt-6 font-semibold">Auto-matched creators</h2>
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 text-left text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-4 py-2">Creator</th>
                      <th className="px-4 py-2">Niche</th>
                      <th className="px-4 py-2">Followers</th>
                      <th className="px-4 py-2">Ask</th>
                      <th className="px-4 py-2">Match</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(({ creator, score }) => {
                      const offer = offers.find((o) => o.campaign_id === selected.id && o.creator_id === creator.id);
                      return (
                        <tr key={creator.id} className="border-t">
                          <td className="px-4 py-2 font-medium">{creator.name}</td>
                          <td className="px-4 py-2">{creator.niche}</td>
                          <td className="px-4 py-2">{formatFollowers(creator.followers)}</td>
                          <td className="px-4 py-2">{formatMoney(creator.price_cents)}</td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-yellow-100 text-yellow-700" : "bg-zinc-200 text-zinc-600"}`}>
                              {score}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-xs text-zinc-500">{offer ? offer.status : "not sent"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-500">Create your first campaign to see auto-matched creators.</p>
          )}
        </section>
      </main>
    </div>
  );
}
