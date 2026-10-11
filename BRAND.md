# Creator Connect — Brand Dossier

The single reference for how Creator Connect looks, sounds and behaves. Every screen, component and
slide should be checked against this file. The source of truth for color is
[`src/app/globals.css`](src/app/globals.css); this document explains the roles behind those tokens.

**Figma:** [Creator Connect: Brand & UI](https://www.figma.com/design/365pTuIHgfvDzgBwjSG3oZ) holds the
color variables (Light/Dark), layout variables (radius, spacing), Geist text styles, the logo components and
the login screen. Variable names map 1:1 to the CSS tokens (`color/primary` is `--primary`).

---

## 1. Brand

| | |
|---|---|
| **Name** | Creator Connect (two words, both capitalised; never "Meta Ads Connect") |
| **One-liner** | Launch creator campaigns like ads. |
| **Promise** | Build a campaign once. We match the right creators and send offers for you. No DMs, no negotiation. |
| **Audience** | **Businesses** (SMEs running creator campaigns) and **Creators** (accept or decline offers). |
| **Personality** | Clear, calm, capable. Closer to a trusted ads tool than a social app. |

### Positioning
Creator Connect is **performance tooling for creator marketing**. It should feel as dependable as an ads
manager (dense where it needs to be, numbers you can trust) with enough warmth that a creator opening their
offer inbox feels respected, not processed.

### Voice
- **Plain and specific.** "Send offers to top 3 creators", not "Leverage our AI-powered outreach".
- **Confident, not hype.** No exclamation marks in product UI. No "revolutionary", "seamless", "supercharge".
- **Honest about data.** Always say where a number comes from (see *Data provenance* below).
- **Sentence case** for buttons, headings, labels and menus. Title Case only for proper nouns.
- **Verbs on buttons.** "Create campaign", "Accept offer", "Send offers".
- **Errors say what happened and what to do**, never blame the user.

---

## 2. Color

One brand accent, cool neutrals, quiet borders. **Indigo-violet is reserved for primary actions, selection,
focus and the first chart series.** Everything else is neutral. If a screen has more than one or two
accent-colored elements competing for attention, remove some.

> Always use the semantic token (`bg-primary`), never a raw Tailwind color (`bg-blue-600`, `bg-zinc-900`).
> Hex values below are sRGB approximations of the OKLCH tokens, for Figma, slides and external tools.

### 2.1 Brand

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| **Primary** | `--primary` | `#5856E9` | `#737AFC` | Primary buttons, links, active nav, selected states, focus ring |
| On primary | `--primary-foreground` | `#FCFCFC` | `#FCFCFC` | Text/icons on primary |
| **Brand subtle** | `--brand-subtle` | `#EFF3FF` | `#1D2040` | Selected chips, "match" highlights, soft callouts |
| Brand subtle text | `--brand-subtle-foreground` | `#4641C7` | `#B3BEFF` | Text on brand subtle |
| Ring | `--ring` | `#5856E9` | `#737AFC` | Focus rings (`ring-ring/50`, 3px) |

### 2.2 Neutrals

| Role | Token | Light | Dark | Use |
|---|---|---|---|---|
| Canvas | `--canvas` | `#F8F9FB` | `#090A0D` | App background behind cards |
| Background | `--background` | `#FFFFFF` | `#0D0E12` | Page surface |
| Card | `--card` | `#FFFFFF` | `#121418` | Cards, panels, popovers (`surface` utility) |
| Foreground | `--foreground` | `#151822` | `#F1F2F4` | Primary text |
| Muted foreground | `--muted-foreground` | `#666874` | `#9598A2` | Secondary text, captions, placeholders |
| Muted / secondary | `--muted`, `--secondary` | `#F3F4F7` | — | Quiet fills, hover backgrounds |
| Border | `--border` | `#E4E5E9` | `white / 8%` | Dividers, card outlines |
| Input border | `--input` | `#DADCE1` | `white / 13%` | Form control outlines |

### 2.3 Status

Each status has a **solid** (icons, dots), a **subtle** (fill) and a **text** (labels on the fill) value.
Pair subtle fill + text color for pills; never put the solid color behind body text.

| Status | Solid | Subtle fill | Text | Meaning |
|---|---|---|---|---|
| **Success** | `#02985F` | `#E4FAEC` | `#00673D` | Accepted, verified, live, paid |
| **Warning** | `#DD881B` | `#FFF5DD` | `#934F00` | Needs attention, pending review, at risk |
| **Destructive** | `#DF2225` | `#FFF0EE` | `#B7191C` | Declined, failed, delete |
| **Neutral** | `--muted-foreground` | `--muted` | `--muted-foreground` | Draft, not started |
| **Brand** | `--primary` | `--brand-subtle` | `--brand-subtle-foreground` | In progress, active |

Implemented by `StatusPill` in [`status-badge.tsx`](src/components/app/status-badge.tsx). Use it; do not
hand-roll badges.

### 2.4 Charts

Brand first, then distinct hues. Never encode meaning by color alone; pair with labels or patterns.

| Series | Token | Light |
|---|---|---|
| 1 | `--chart-1` | `#5856E9` |
| 2 | `--chart-2` | `#00B5B5` |
| 3 | `--chart-3` | `#E4A339` |
| 4 | `--chart-4` | `#DF539F` |
| 5 (other) | `--chart-5` | `#7C808D` |

### 2.5 Contrast rules
- Body text on background must meet **WCAG AA (4.5:1)**; large text and UI components 3:1.
- Primary `#5856E9` on white and white on primary both pass AA for normal text.
- `muted-foreground` is for secondary text only; do not use it for disabled-looking primary content.
- Dark mode is a first-class theme, not an afterthought. Check every new screen in both.

### 2.6 Data provenance (a brand rule, not just a style)
Creator Connect's credibility is the numbers. Every metric should carry its source via `DataTag`:

| Tag | Meaning | Visual |
|---|---|---|
| **Verified** | Platform-confirmed organic views | success text, solid ring |
| **Attributed** | Clicks / codes / conversions | brand text, solid ring |
| **Estimate** | Projection | muted text, dashed outline |
| **Guaranteed** | Contractual floor | foreground text, solid ring |

---

## 3. Typography

| | |
|---|---|
| **Typeface** | Geist Sans (UI), Geist Mono (IDs, code, rare tabular data) via `next/font` |
| **Numbers** | Always `tabular-nums` |
| **Case** | Sentence case; uppercase only for tiny `DataTag`-style labels with tracking |

| Style | Classes | Use |
|---|---|---|
| Display | `text-3xl font-semibold tracking-tight` | Landing / auth heroes |
| Title | `text-xl font-semibold tracking-tight` | Page titles |
| Heading | `text-base font-semibold` | Card and section titles |
| Body | `text-sm` | Default UI text |
| Caption | `text-xs text-muted-foreground` | Helper and meta text |
| Micro | `text-[11px] font-medium` | Pills, tags |

---

## 4. Layout, shape and depth

- **Spacing:** 4px grid. Cards `p-5`, sections `gap-6`, page gutters `px-6` / `px-8`.
- **Radius:** square everywhere (`--radius: 0`). Buttons, inputs, cards, pills, chips, avatars and progress
  bars are all square. Only functional circles stay round: status dots, radio buttons, switches, slider
  thumbs. Don't add `rounded-full` / `rounded` to new UI.
- **Surfaces:** use the `surface` utility (card fill + 1px border; `shadow-card` is now flat).
- **Elevation:** flat with a 1px border by default. `shadow-float` only for things that genuinely float above
  the page: menus, popovers, dialogs and toasts. No decorative glows or blurred blobs.
- **Density:** the business app is dense by design (tables, KPIs). The creator app is airier (cards, one
  primary action per offer).

---

## 5. Logo

Mark: two overlapping circles (an outlined circle and a filled circle at 55% opacity), meaning two parties
connecting. Implemented as `LogoMark` / `Logo` in [`logo.tsx`](src/components/brand/logo.tsx).

- **Default:** mark in a `primary` rounded square (`rounded-lg`) with `primary-foreground` glyph, followed
  by the wordmark "Creator Connect" in semibold, tight tracking.
- **Minimum size:** mark 20px; with wordmark 96px wide.
- **Clear space:** at least half the mark's height on all sides.
- **On dark or photographic backgrounds:** use the same mark; do not recolor or add gradients to it.
- **Don't:** stretch, rotate, outline, add shadows, change the wordmark typeface, or use the old
  "M / Meta Ads Connect" square.

---

## 6. Components

Use the shadcn/ui primitives in `src/components/ui/`; extend them rather than re-implementing.

| Need | Use | Notes |
|---|---|---|
| Primary action | `Button` (default) | One per view or card |
| Secondary action | `Button variant="outline"` | |
| Low emphasis | `variant="ghost"` / `secondary` | |
| Destructive | `variant="destructive"` | Soft red fill, not solid |
| Form fields | `Input`, `Textarea`, `Select`, `Label` | Never raw `<input>` with ad-hoc classes |
| Status | `StatusPill`, `StageBadge`, `ActivationBadge`, `PostBadge` | |
| Data source | `DataTag` | |
| Filters | `ChipToggle` | Selected = brand subtle |
| Cards | `Card` or `surface` utility | |
| Feedback | `sonner` toasts | Bottom-right |

**States every interactive element needs:** default, hover, focus-visible (3px ring), active (1px press),
disabled (50% opacity), and, for inputs, invalid (destructive border + ring).

---

## 7. Imagery and iconography

- **Icons:** Lucide, 16px default (`size-4`), 1.5–2px stroke, inherit text color. Platform logos via
  `platform-icon.tsx`.
- **No people in imagery.** Content and post thumbnails are product, food and object shots only (no faces,
  hands or bodies). Creators are shown as square initials tiles (`CreatorPhoto`), tinted per name. Photos
  go through the shared `Photo` component; crop square or 4:5; never stretch.
- **No stock "handshake" or gradient-blob illustrations.**

---

## 8. Motion

Subtle and functional. 150–200ms ease-out for hover/press and overlays. `tw-animate-css` for dialogs and
sheets. No looping animation except loading states and the single hero treatment on the auth/landing
pages. Respect `prefers-reduced-motion`.

---

## 9. Do and don't

| Do | Don't |
|---|---|
| Use semantic tokens for every color | Use raw `zinc-*`, `blue-*`, `green-*`, `red-*` classes |
| Reserve indigo for the one thing you want clicked | Make every button and heading indigo |
| Show the data source on numbers | Present estimates as facts |
| Design light and dark together | Ship screens that only work in light |
| Keep copy short, specific, sentence case | Use hype words or all-caps headlines |
| Use `StatusPill` and `DataTag` | Invent new badge styles per screen |

---

## 10. Known gaps (to fix in the redesign)

Current state, audited against this dossier:

1. ~~`/login` off-brand~~ Rebuilt (Login v2). ✅
2. ~~`/` off-brand, "Meta Ads Connect"~~ Rebuilt on the system. ✅
3. ~~Green/blue audience accents~~ Both audiences now share the indigo accent. ✅
4. ~~No brand gradient or hero treatment~~ See §11. ✅
5. The business and creator apps already use the tokens correctly; they need a component-by-component
   review, not a rebuild. **Next.**
6. `package.json` name is still `meta-adds-connect` (internal only).

## 11. Additions since v1

Shipped:

- **`--input-strong`** (`#868995`-ish light, 3.6:1 on white): boundary for inputs, textareas, selects and
  outline buttons. The old `--input` (1.4:1) failed WCAG 1.4.11 and is now only used for fills.
- **Primary hover darkens** (`color-mix(primary, black 14%)`) instead of fading to 80%, which dropped white
  label contrast to about 4:1.
- **`bg-brand-gradient`** utility: indigo → deep violet wash plus a soft white glow. Auth brand panel,
  landing hero card and closing CTA only.
- **Hero type** (`Text/Hero` in Figma): 40/48 semibold, -0.025em. Desktop brand panels only; Display on mobile.
- **Auth pattern** (`/login`): split layout, form first on mobile; role switch is a keyboard-operable radio
  group; inline field errors use icon + text with `aria-invalid`/`aria-describedby`; form errors use
  `role="alert"`; Google sign-in via Supabase OAuth.
- **Product moments** (`src/components/auth/auth-showcase.tsx`): `VideoThumbnail`, `CampaignCard`,
  `PayoutNotification`. Reuse these for marketing surfaces instead of drawing abstract shapes.

Still proposed:

- A mono-color wordmark variant for dark brand panels.
