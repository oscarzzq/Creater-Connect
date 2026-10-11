"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { respondToOffer } from "@/app/actions/campaigns";
import type { Campaign, Offer, Profile } from "@/lib/types";

// Live mode (Supabase): when a signed-in profile exists, load that user's offers,
// keep them fresh over realtime, and respond through the server action.
// Without Supabase env vars or a session this stays idle and the demo store is used.

export interface LiveOffer extends Offer {
  campaign?: Campaign;
}

export function useLiveOffers() {
  const [live, setLive] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offers, setOffers] = useState<LiveOffer[]>([]);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        if (!isSupabaseConfigured()) return;
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (!me || cancelled) return;
        setLive(true);
        setProfile(me as Profile);

        const load = async () => {
          const { data } = await supabase
            .from("offers")
            .select("*, campaign:campaigns(*)")
            .eq("creator_id", user.id)
            .order("created_at", { ascending: false });
          if (data && !cancelled) setOffers(data as unknown as LiveOffer[]);
        };
        await load();

        // Realtime: new bids and status changes appear live.
        const channel = supabase
          .channel(`offers-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `creator_id=eq.${user.id}` }, () => {
            void load();
          })
          .subscribe();
        cleanup = () => {
          supabase.removeChannel(channel);
        };
        if (cancelled) cleanup();
      } catch {
        // demo mode
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  const respond = useCallback(async (id: string, status: "accepted" | "rejected"): Promise<{ error?: string }> => {
    try {
      const res = await respondToOffer(id, status);
      if (res.error) return { error: res.error };
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Something went wrong" };
    }
  }, []);

  return { live, profile, offers, respond };
}
