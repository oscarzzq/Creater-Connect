// Seeds demo users + campaigns + offers via the anon/publishable key.
// Prereqs (do once in Supabase dashboard):
//   1. SQL Editor -> run supabase/schema.sql
//   2. Auth -> Providers -> Email -> turn OFF "Confirm email" (hackathon only)
// Run: node scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";

import { readFileSync, existsSync } from "fs";
// minimal .env.local loader (no dotenv dep) — must run before reading env
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !anon) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const PASSWORD = "demo1234";

// Preflight: tables must exist (run supabase/schema.sql first)
{
  const r = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (r.status === 404) {
    console.error("profiles table not found — run supabase/schema.sql in Supabase SQL Editor first.");
    process.exit(1);
  }
}

const BUSINESS = { email: "biz@demo.test", name: "Glow Inc.", role: "business" };
const CREATORS = [
  { email: "maya@demo.test", name: "Maya Chen", niche: "beauty", followers: 182000, price_cents: 15000 },
  { email: "jordan@demo.test", name: "Jordan Lee", niche: "fitness", followers: 95000, price_cents: 9000 },
  { email: "sofia@demo.test", name: "Sofia Reyes", niche: "lifestyle", followers: 240000, price_cents: 22000 },
  { email: "dev@demo.test", name: "Dev Patel", niche: "tech", followers: 120000, price_cents: 18000 },
  { email: "ava@demo.test", name: "Ava Kim", niche: "food", followers: 67000, price_cents: 7000 },
  { email: "liam@demo.test", name: "Liam Carter", niche: "travel", followers: 310000, price_cents: 30000 },
  { email: "nora@demo.test", name: "Nora Ali", niche: "fashion", followers: 145000, price_cents: 16000 },
  { email: "kai@demo.test", name: "Kai Wong", niche: "gaming", followers: 89000, price_cents: 11000 },
];

async function getAuthedClient(email) {
  const sb = createClient(url, anon);
  // try sign in first (idempotent re-runs), fall back to sign up
  let { data, error } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) {
    const res = await sb.auth.signUp({ email, password: PASSWORD });
    if (res.error) throw new Error(`${email}: signup failed: ${res.error.message}`);
    data = res.data;
    if (!res.data.session) {
      // email confirmation is ON — retry sign in once in case user got confirmed
      const retry = await sb.auth.signInWithPassword({ email, password: PASSWORD });
      if (retry.error)
        throw new Error(
          `${email}: no session (email confirmation likely ON). Turn OFF "Confirm email" in Auth > Providers > Email, then re-run.`
        );
      data = retry.data;
    }
  }
  if (!data.session) throw new Error(`${email}: no session returned.`);
  return { sb, user: data.session.user };
}

const ids = {};
// 1. business
{
  const { sb, user } = await getAuthedClient(BUSINESS.email);
  ids.business = user.id;
  const { error } = await sb.from("profiles").upsert({
    id: user.id, role: "business", name: BUSINESS.name,
  });
  if (error) throw new Error(`business profile: ${error.message}`);
  console.log("business:", BUSINESS.email, user.id);

  // 2. campaigns (insert missing by title — idempotent re-runs)
  const wanted = [
    {
      business_id: user.id, title: "Glow Serum Launch",
      brief: "30s TikTok + 1 IG Story. Hook in first 2s, show morning routine. #glowup",
      budget_cents: 200000, niche_target: "beauty", min_followers: 50000, max_payout_cents: 20000, status: "active",
    },
    {
      business_id: user.id, title: "Protein Bar Try-On",
      brief: "Gym vlog integration, taste test on camera.",
      budget_cents: 100000, niche_target: "fitness", min_followers: 30000, max_payout_cents: 12000, status: "active",
    },
  ];
  const { data: existing } = await sb.from("campaigns").select("id,title").eq("business_id", user.id);
  const have = new Set((existing ?? []).map((c) => c.title));
  const missing = wanted.filter((w) => !have.has(w.title));
  if (missing.length > 0) {
    const { error: cErr } = await sb.from("campaigns").insert(missing);
    if (cErr) throw new Error(`campaigns: ${cErr.message}`);
  }

  // store campaign ids for offers
  const { data: allCamps } = await sb.from("campaigns").select("id,title").eq("business_id", user.id);
  ids.camps = Object.fromEntries((allCamps ?? []).map((c) => [c.title, c.id]));
  ids.bizClient = sb;
}

// 3. creators
for (const c of CREATORS) {
  const { sb, user } = await getAuthedClient(c.email);
  ids[c.email] = user.id;
  const { error } = await sb.from("profiles").upsert({
    id: user.id, role: "creator", name: c.name, niche: c.niche,
    followers: c.followers, price_cents: c.price_cents,
  });
  if (error) throw new Error(`${c.email} profile: ${error.message}`);
  console.log("creator:", c.email, user.id);
}

// 4. offers (as business client)
{
  const sb = ids.bizClient;
  const glow = ids.camps["Glow Serum Launch"];
  const protein = ids.camps["Protein Bar Try-On"];
  const rows = [
    { campaign_id: glow, creator_id: ids["maya@demo.test"], payout_cents: 15000, match_score: 96 },
    { campaign_id: glow, creator_id: ids["nora@demo.test"], payout_cents: 16000, match_score: 71 },
    { campaign_id: glow, creator_id: ids["sofia@demo.test"], payout_cents: 22000, match_score: 68, status: "accepted" },
    { campaign_id: protein, creator_id: ids["jordan@demo.test"], payout_cents: 9000, match_score: 94 },
    { campaign_id: protein, creator_id: ids["ava@demo.test"], payout_cents: 7000, match_score: 55, status: "rejected" },
  ];
  for (const r of rows) {
    const { error } = await sb.from("offers").upsert(
      { ...r, status: r.status ?? "pending" },
      { onConflict: "campaign_id,creator_id" }
    );
    if (error) throw new Error(`offer ${r.creator_id}: ${error.message}`);
  }
  console.log("offers: 5 seeded");
}

console.log("\nDone. Demo logins (password: demo1234):");
console.log("  business: biz@demo.test -> /business");
console.log("  creator:  maya@demo.test -> /creator");
