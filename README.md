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

Model: **Campaign → Creator set → Creator activation → Post** (creator-posted organic distribution, fixed creator fees, optional delivery guarantee on verified organic views).

- `src/app/business/(app)/` — business app: Overview, Campaigns (Ads Manager: Campaigns | Creator sets | Posts), campaign detail (`campaigns/[id]`: Overview, Creator sets, Roster, Posts, Brief), Inbox, Settings (brand, team, payments & billing, integrations)
- `src/app/business/campaigns/new/` — 5-step builder (Guided / Advanced): objective & basics → creator sets → brief → creator matching & approval → review & launch
- `src/app/creator/` — creator app: offer inbox (accept / decline / ask), offer detail with production tracker, work, earnings & profile, onboarding
- `src/lib/domain/` — typed demo world, pricing + explainable matching (`matching.ts`), derived reporting/inbox (`metrics.ts`)
- `src/lib/store.ts` — client store shared by business + creator views (localStorage, syncs across tabs; "Reset demo data" in the user menu)
- `src/components/app/`, `src/components/creator/` — shared UI; `src/components/ui/` — shadcn/ui
- `supabase/schema.sql` — legacy profiles / campaigns / offers schema (live mode)

Demo data uses a fixed demo date (Oct 8, 2026). **Verified** = platform-confirmed organic views; **Attributed** = clicks/codes/conversions; **Estimate** = projections; **Guaranteed** = contractual floor.

## Pitch script (60s)

1. `/business`: "SME builds Glow Serum Launch like a Meta ad — budget, niche, brief."
2. Click "Send offers to top 3": "No DMs. Our layer fires bids to best-fit creators by match score."
3. Switch to `/creator`: "Maya gets the bid with brief + payout. Accept in one tap."
4. Back to `/business`: "Brand sees accepted live. Campaign scales from 3 to 300 creators without negotiations."
