-- Meta Ads Connect — MVP schema
-- Run this in Supabase Dashboard > SQL Editor > New Query
-- Idempotent: safe to re-run

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('business','creator')),
  name text not null,
  niche text,
  followers int default 0,
  price_cents int default 0,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Campaigns (business creates, like Meta Ads Manager)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  brief text not null default '',
  budget_cents int not null default 50000,
  niche_target text not null default 'lifestyle',
  min_followers int not null default 0,
  max_payout_cents int not null default 20000,
  status text not null default 'active' check (status in ('draft','active','paused','completed')),
  created_at timestamptz default now()
);

-- 3. Offers / Bids (campaign -> creator)
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  payout_cents int not null default 10000,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  match_score int not null default 0,
  created_at timestamptz default now(),
  unique(campaign_id, creator_id)
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.offers enable row level security;

-- Drop old policies for idempotency
drop policy if exists "profiles readable by all authed" on public.profiles;
drop policy if exists "users can upsert own profile" on public.profiles;
drop policy if exists "campaigns readable by authed" on public.campaigns;
drop policy if exists "business can manage own campaigns" on public.campaigns;
drop policy if exists "offers readable by involved parties" on public.offers;
drop policy if exists "business can manage offers for own campaigns" on public.offers;
drop policy if exists "creator can update own offer status" on public.offers;

-- Profiles: anyone authed can read (needed for matching), users manage own
create policy "profiles readable by all authed"
  on public.profiles for select to authenticated using (true);
create policy "users can upsert own profile"
  on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Campaigns: readable by all authed (creators need to see brief on offers)
create policy "campaigns readable by authed"
  on public.campaigns for select to authenticated using (true);
create policy "business can manage own campaigns"
  on public.campaigns for all to authenticated
  using (auth.uid() = business_id) with check (auth.uid() = business_id);

-- Offers: business sees own campaign offers, creator sees own offers
create policy "offers readable by involved parties"
  on public.offers for select to authenticated using (
    auth.uid() = creator_id
    or exists (select 1 from public.campaigns c where c.id = campaign_id and c.business_id = auth.uid())
  );
create policy "business can manage offers for own campaigns"
  on public.offers for insert to authenticated with check (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.business_id = auth.uid())
  );
create policy "business can update own campaign offers"
  on public.offers for update to authenticated using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.business_id = auth.uid())
  );
create policy "creator can update own offer status"
  on public.offers for update to authenticated using (
    auth.uid() = creator_id
  );

-- Realtime for offer accept/reject demo wow-factor
alter publication supabase_realtime add table public.offers;

-- Seed demo creators (run after you create 2 demo auth users, or use demo mode without auth)
-- This seed uses fixed UUIDs so you can match them to auth users if needed.
-- For pure UI demo, the app falls back to in-memory demo data when Supabase env is missing.
