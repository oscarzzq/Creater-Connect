# Klynt — Launch creator campaigns like ads.

**An ads manager for creator marketing. Brands brief once, we match the right creators and send offers automatically, and creators accept in one tap.**

🎬 **Demo video:** https://drive.google.com/file/d/1SbHeHk2o9qVUoQPBMNihWHe8irv9GhxD/view?usp=share_link

> Live demo: `/business` = brand dashboard, `/creator` = creator inbox. See [Run the demo](#run-the-demo-30s-no-backend) below.

---

## The problem

Finding the right creators and measuring results are **THE biggest problems for B2B companies in influencer marketing**:

1. **1 in 3 brands** say finding the right creators is their biggest hurdle¹
2. **56.5% of reported fraud issues** are fake or bot followers²
3. **87% of creators** have faced late payments or other payment problems³

¹ IAB, 2025 Creator Economy Ad Spend & Strategy Report. ² Influencer Marketing Hub, Benchmark Report 2026. ³ Tipalti/Lumanu via Campaign US.

Current channels are cold and capped: referrals run out, cold outbound reaches strangers with no trust, paid ads need skill and costs keep rising. Meanwhile 70% of B2B marketers say buyers rely more on peer/expert voices than brand content, and US creator ad spend hit **$37B in 2025 (+26%, growing 4x faster than total media)**.

## The opportunity

B2B companies have high willingness to pay (high CLV, larger contracts, chronic client-acquisition pain). Creators open a **warm channel**: trusted voices reaching buyers who ignore ads and cold emails, with niche audiences matching exact buyers.

Klynt makes that channel buyable — like Meta ads.

## What we built

A two-sided working product (Next.js + Supabase), demo-ready with no backend:

**For brands**
1. **5-step campaign builder** (Guided / Advanced): objective & basics → creator sets → brief → matching & approval → review & launch. Example: "Glow Lip Oil Launch" with $3,000 budget → ~8 creators, $2,932 fees, 155K–416K est. views, 130K guaranteed floor.
2. **Explainable match score per creator** — weighted across audience fit (30%), content relevance (25%), organic view performance (20%), cost efficiency (15%), audience quality (10%), with strict exclusions (niche, platform, geo, gender, language, min views, follower range, max fee, verified quality ≥80%). Every score shows *why*, plus watch-outs.
3. **Fixed-fee offers to 3 or 300 creators in one click** — fees derived from predicted organic views (platform CPMs + sponsored discount), greedy roster builder fills budget automatically, replacement suggestions when someone declines.
4. **Pay on verified views** — platform-confirmed organic views vs. attributed conversions vs. estimates vs. contractual guaranteed floor (85% of summed low estimates). Campaign detail tracks Overview, Creator sets, Roster, Posts, Brief.

**For creators**
1. **Offer inbox** with brief, payout, usage rights, and "why you" up front
2. **Accept / decline / ask in one tap**, with message thread
3. **Production tracker**: draft → approval → publishing → payout, plus work, earnings & profile, onboarding

Business side also includes Ads-Manager-style tables (Campaigns | Creator sets | Posts), Inbox, and Settings (brand, team, payments & billing, integrations) — all sharing one client store (localStorage, syncs across tabs).

## Who it's for

- **Brands:** B2B startups and mid-sized companies running creator campaigns on LinkedIn, X, YouTube, TikTok/Instagram. They can't staff 1:1 creator outreach and need proof the right buyers saw posts before spending more.
- **Creators:** professional niche voices (engineers, founders, analysts, beauty/lifestyle) who want clear briefs and fair, fixed payouts — no DM negotiations, no late payments.

## How it works

```
Brand: brief once → Creator set (niche, platforms, demo, geo, budget, max fee)
  → matchCreator() scores every creator → recommendRoster() fills budget
  → bulk fixed-fee offers fired
Creator: inbox → accept in one tap → submit draft → approval → publish → payout
Brand: roster + posts update live, verified views vs. guaranteed floor
```

Key logic lives in `src/lib/domain/matching.ts` (`quote`, `matchCreator`, `matchSet`, `recommendRoster`, `guaranteeFloor`) over typed seed data in `src/lib/domain/`.

## Why Klynt wins

| | Upfront cost | Matching | Pays on verified results |
|---|---|---|---|
| **Klynt** | **None (1% of creator fees)** | **Automated + explainable** | **Yes** |
| Marketplaces (Collabstr, Insense) | Low | Manual — brand does the work | No |
| Enterprise SaaS (GRIN, Aspire, CreatorIQ) | $24K+/yr annual contracts | Yes, but expensive | Partial |
| Agencies | High | Manual | No |

No subscription, no annual contract — even a small business can launch its first campaign. Others charge $2,000–2,500/mo or 5–15% take rates.

Market: $1.34T global ads → $5.6B US small-B2B creator campaigns (SAM) → $64M spend (~$7.7M revenue) SOM by 2030.

## Traction (7 days)

- Funded by billionaire Ronnen Harary to validate product in 7 days
- Tech Week @ Slash: **15 companies indicated WTP and interest**
- Cold outreach: **100% positive reply rate** from B2B companies
- Testimonials: Gravity AI founder (adtech, $40M Series A), a16z Speedrun, Berkeley Skydeck founders, YC-backed startups, 10+ warm discovery leads

## Run the demo (30s, no backend)

```bash
npm install
npm run dev
# open http://localhost:3000
# /business = brand dashboard, /creator = creator inbox
```

**60-second judge script:**
1. `/business` → open "Glow Lip Oil Launch": "SME builds a campaign like a Meta ad — budget, niche, brief."
2. Click "Send offers to top 3": "No DMs. Offers fire to best-fit creators by match score."
3. Switch to `/creator`: "Creator gets brief + payout + why-you. Accepts in one tap."
4. Back to `/business`: "Brand sees it live. Scales from 3 to 300 creators without negotiation."

Demo data uses a fixed demo date (Oct 8, 2026). **Verified** = platform-confirmed organic views; **Attributed** = clicks/codes/conversions; **Estimate** = projections; **Guaranteed** = contractual floor. "Reset demo data" in the user menu restores seed.

## Tech & structure

Next.js 16, React 19, Tailwind 4, shadcn/ui, Supabase (auth + persistence when configured).

- `src/app/business/(app)/` — Overview, Campaigns (Campaigns | Creator sets | Posts), campaign detail (`campaigns/[id]`), Inbox, Settings
- `src/app/business/campaigns/new/` — 5-step builder; `src/app/business/_editor/` — form state
- `src/app/creator/` — inbox, offer detail + tracker, work, earnings, onboarding
- `src/lib/domain/` — types, seed, creators, matching, metrics; `src/lib/store.ts` — shared client store
- `supabase/schema.sql` — profiles / campaigns / offers schema for live mode

Connect Supabase (~10 min): create project → run `supabase/schema.sql` in SQL Editor → copy URL + anon key → `cp .env.example .env.local` → fill in → `npm run dev`. Then wire magic-link auth (`/login`), real campaign/offer inserts, realtime accept/reject.

## Team

- **Lamar Jweher** — Wharton Marketing & Ops; ex-founder B2B marketing agency
- **Oscar Zhang** — UC Berkeley CS; prev MLE @ Deep Robotics
- **Eleyn Xiong** — UC Berkeley Data Science; prev Delta Airlines PM, Berkeley Lab researcher
- **Haaziq Kazi** — UC Berkeley Data Science; prev researcher @ Berkeley AI Research
