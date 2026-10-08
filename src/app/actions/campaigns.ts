"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Always verify auth inside every Server Function (Next.js docs requirement).
async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated — sign in at /login first.");
  return { supabase, user };
}

export async function createCampaign(formData: FormData) {
  const { supabase, user } = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const budget_cents = Math.round(Number(formData.get("budget_usd") ?? 0) * 100);
  const niche_target = String(formData.get("niche") ?? "lifestyle");
  const min_followers = Number(formData.get("min_followers") ?? 0);
  const max_payout_cents = Math.round(Number(formData.get("max_payout_usd") ?? 0) * 100);

  if (!title) return { error: "Title is required." };

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      business_id: user.id,
      title,
      brief,
      budget_cents,
      niche_target,
      min_followers,
      max_payout_cents,
      status: "active",
    })
    .select("id")
    .single();

  if (error) return { error: `DB error: ${error.message}. Did you run supabase/schema.sql?` };
  revalidatePath("/business");
  return { id: (data as { id: string }).id };
}

export async function sendOffers(campaignId: string, creatorIds: string[], payouts: Record<string, number>, scores: Record<string, number>) {
  const { supabase, user } = await requireUser();

  // Verify the campaign belongs to this business
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, business_id")
    .eq("id", campaignId)
    .single();
  if (!campaign || (campaign as { business_id: string }).business_id !== user.id) {
    return { error: "Not your campaign." };
  }

  const rows = creatorIds.map((cid) => ({
    campaign_id: campaignId,
    creator_id: cid,
    payout_cents: payouts[cid] ?? 10000,
    match_score: scores[cid] ?? 50,
    status: "pending",
  }));

  const { error } = await supabase.from("offers").upsert(rows, {
    onConflict: "campaign_id,creator_id",
    ignoreDuplicates: false,
  });
  if (error) return { error: error.message };
  revalidatePath("/business");
  revalidatePath("/creator");
  return { sent: rows.length };
}

export async function respondToOffer(offerId: string, status: "accepted" | "rejected") {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("offers")
    .update({ status })
    .eq("id", offerId)
    .eq("creator_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/creator");
  revalidatePath("/business");
  return { ok: true };
}
