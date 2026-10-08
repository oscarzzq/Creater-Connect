# Meta Ads Connect — Hackathon MVP

Native adtech: automate creator outreach. Businesses build campaigns (Ads Manager style), creators get offers/bids to accept/reject.

## Run demo (no backend, 30s)

```bash
npm install
npm run dev
# open http://localhost:3000
# /business = SME dashboard, /creator = creator inbox
```

Demo data is in-memory (`src/lib/demo-data.ts`), matching score in `src/lib/matching.ts`.

## Connect Supabase (your task, ~10 min)

1. Go to https://supabase.com/dashboard → New project (free tier, region closest to you).
2. Wait for provisioning → go to **SQL Editor → New query**.
3. Paste entire contents of `supabase/schema.sql` → **Run**. Should say success, 3 tables + policies + realtime.
4. Go to **Project Settings → API**: copy `Project URL` + `anon public` key.
5. Locally:
   ```bash
   cp .env.example .env.local
   # edit .env.local with your URL + ANON key
   npm run dev
   ```
6. (Next step for me) Once you paste your URL here / confirm tables exist, I'll wire:
   - magic-link auth (`/login` → Supabase Auth)
   - real `campaigns` insert from `/business/campaigns/new`
   - bulk `offers` insert + realtime accept/reject
   - RLS-tested role views

## Structure

- `src/app/page.tsx` — landing
- `src/app/business/` — campaign list + auto-match table + new campaign form
- `src/app/creator/` — offer inbox, accept/reject
- `supabase/schema.sql` — profiles / campaigns / offers + RLS + realtime
- `src/lib/` — supabase clients, types, matching, demo-data

## Pitch script (60s)

1. `/business`: "SME builds Glow Serum Launch like a Meta ad — budget, niche, brief."
2. Click "Send offers to top 3": "No DMs. Our layer fires bids to best-fit creators by match score."
3. Switch to `/creator`: "Maya gets the bid with brief + payout. Accept in one tap."
4. Back to `/business`: "Brand sees accepted live. Campaign scales from 3 to 300 creators without negotiations."
