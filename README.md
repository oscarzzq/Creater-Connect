# Klynt — Hackathon MVP

B2B creator marketing. Companies in AI, developer tools, cybersecurity, enterprise SaaS and fintech reach professional and technical audiences through trusted industry creators (ML researchers, software engineers, security analysts, technical educators) who publish clearly disclosed sponsored content on their own channels. Businesses build campaigns Ads Manager style, an explainable matching engine scores creators on audience fit, relevance, view performance and cost, and creators review, accept, decline or ask a question about each offer.

## Run demo (no backend, 30s)

```bash
npm install
npm run dev
# open http://localhost:3000
# /business = business dashboard, /creator = creator inbox
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

Model: **Campaign → Creator set → Creator activation → Post** (creator-posted organic distribution; the business sets a fixed price per creator and Klynt adds a 1% fee; optional delivery guarantee on verified organic views).

- `src/app/business/(app)/` — business app: Overview, Campaigns (Ads Manager: Campaigns | Creator sets | Posts), campaign detail (`campaigns/[id]`: Overview, Creator sets, Roster, Posts, Brief), Inbox, Settings (brand, team, payments & billing, integrations)
- `src/app/business/campaigns/new/` — 5-step builder (Guided / Advanced): objective & basics → creator sets → brief → creator matching & approval → review & launch
- `src/app/creator/` — creator app: offer inbox (accept / decline / ask), offer detail with production tracker, work, earnings & profile, onboarding
- `src/lib/domain/` — typed demo world, pricing + explainable matching (`matching.ts`), derived reporting/inbox (`metrics.ts`)
- `src/lib/store.ts` — client store shared by business + creator views (localStorage, syncs across tabs; "Reset demo data" in the user menu)
- `src/components/app/`, `src/components/creator/` — shared UI; `src/components/ui/` — shadcn/ui
- `supabase/schema.sql` — legacy profiles / campaigns / offers schema (live mode)

Demo data uses a fixed demo date (Oct 8, 2026). **Verified** = platform-confirmed organic views; **Attributed** = clicks/codes/conversions; **Estimate** = projections; **Guaranteed** = contractual floor.

## Pitch script (60s)

1. `/business`: "Kestrel AI builds Kestrel 2 Launch like an ad campaign: budget, target audience, brief."
2. Click "Send offers to top 3": "No manual searching through thousands of profiles. Offers go to the best-fit creators by explainable match score."
3. Switch to `/creator`: "The creator gets the offer with brief + payout and can accept, decline or ask a question."
4. Back to `/business`: "The team sees acceptances live and tracks verified views. The campaign scales from 3 to 300 creators without negotiations."
