import Link from "next/link";
import { ArrowRight, BadgeCheck, Inbox, Megaphone, Sparkles, Wallet } from "lucide-react";
import { CampaignCard, PayoutNotification, POSTS, VideoThumbnail } from "@/components/auth/auth-showcase";
import { DataTag } from "@/components/app/status-badge";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: Megaphone,
    title: "Build a campaign once",
    body: "Set a budget, the professional audience you want to reach, a brief and the price you'll pay each creator, the way you would in an ads manager. No spreadsheets, no cold outreach.",
  },
  {
    icon: Sparkles,
    title: "Get matched with relevant creators",
    body: "Our matching engine gives every creator an explainable score on audience fit, relevance, view performance and cost. Offers go out at your price; no negotiation.",
  },
  {
    icon: BadgeCheck,
    title: "Pay on verified views",
    body: "Creators review the offer, accept, and publish clearly disclosed content on their own channels. You see platform-verified views, not screenshots.",
  },
];

const AUDIENCES = [
  {
    eyebrow: "For businesses",
    title: "Reach your ideal customers through creators they already trust",
    points: [
      "For marketing, DevRel and growth teams, from startups to enterprise",
      "Explainable match scores instead of searching thousands of profiles",
      "Optional delivery guarantee on verified organic views",
    ],
    cta: { label: "Open the business demo", href: "/business" },
    icon: Megaphone,
  },
  {
    eyebrow: "For creators",
    title: "Sponsorships that fit your expertise",
    points: [
      "Offers relevant to your expertise and audience, with the brief and payout up front",
      "Review, accept, decline or ask a question about every offer",
      "Content stays authentic, on your own channels, and clearly disclosed",
    ],
    cta: { label: "Open the creator demo", href: "/creator" },
    icon: Inbox,
  },
];

const PROVENANCE = [
  { kind: "verified", label: "Verified", body: "Organic views confirmed by the platform." },
  { kind: "attributed", label: "Attributed", body: "Clicks, codes and sign-ups we can trace. Reported, never promised." },
  { kind: "estimate", label: "Estimate", body: "Projections, always labelled as such." },
  { kind: "guaranteed", label: "Guaranteed", body: "A contractual floor on verified organic views. It never covers clicks, sign-ups or revenue." },
] as const;

const link = "rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Klynt home" className={link}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how-it-works" className={`${link} hover:text-foreground`}>How it works</a>
            <a href="#who-its-for" className={`${link} hover:text-foreground`}>Who it&apos;s for</a>
            <a href="#trust" className={`${link} hover:text-foreground`}>Data you can trust</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden h-9 px-3 sm:inline-flex">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="h-9 px-3">
              <Link href="/business">Try the demo</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1fr_minmax(0,520px)] lg:pt-20 lg:pb-24">
          <div className="flex flex-col gap-6">
            <p className="w-fit bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand-subtle-foreground">
              B2B creator marketing
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
              Reach the right audience through the right creators.
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Discover and partner with trusted industry creators who can introduce your product to the people who matter.
              Our intelligent matching engine connects your campaigns with relevant creators across professional and
              technical communities.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-11 px-5 text-base">
                <Link href="/login">
                  Start a campaign
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-input-strong px-5 text-base">
                <Link href="/login?role=creator">I&apos;m a creator</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Just looking? Explore the{" "}
              <Link href="/business" className={`${link} font-medium text-primary hover:underline`}>business demo</Link> or the{" "}
              <Link href="/creator" className={`${link} font-medium text-primary hover:underline`}>creator demo</Link>. No account needed.
            </p>
          </div>

          {/* Illustrative product preview */}
          <div aria-hidden className="bg-primary p-5 sm:p-8">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {POSTS.map((post, i) => (
                  <VideoThumbnail
                    key={post.handle}
                    post={post}
                    className={cn("w-auto", i === 2 && "hidden sm:flex")}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-4">
                <CampaignCard />
                <PayoutNotification />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t bg-canvas">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="flex max-w-2xl flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
              <p className="text-muted-foreground">From brief to verified views in three steps, whether you sell AI models, developer tools, security, SaaS or fintech products. The creator side is just as simple.</p>
            </div>
            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex border bg-card flex-col gap-4 p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-lg bg-brand-subtle text-brand-subtle-foreground">
                      <s.icon className="size-5" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Audiences */}
        <section id="who-its-for" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="sr-only">Who it&apos;s for</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {AUDIENCES.map((a) => (
              <article key={a.eyebrow} className="flex border bg-card flex-col gap-5 p-6 sm:p-8">
                <span className="flex items-center gap-2 text-sm font-medium text-brand-subtle-foreground">
                  <a.icon className="size-4" aria-hidden />
                  {a.eyebrow}
                </span>
                <h3 className="text-xl font-semibold tracking-tight">{a.title}</h3>
                <ul className="flex flex-col gap-2.5 text-sm">
                  {a.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-auto h-10 w-fit border-input-strong px-4">
                  <Link href={a.cta.href}>
                    {a.cta.label}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="scroll-mt-20 border-t bg-canvas">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-24">
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-semibold tracking-tight">Numbers you can trust</h2>
              <p className="text-muted-foreground">
                Every metric in Klynt says where it came from, so you never mistake a projection for a result.
                Views can be guaranteed. Sign-ups, pipeline and revenue never are.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {PROVENANCE.map((p) => (
                <div key={p.kind} className="flex border bg-card flex-col gap-2 p-5">
                  <dt><DataTag kind={p.kind} className="rounded-none" /></dt>
                  <dd className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{p.label}. </span>
                    {p.body}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="bg-primary px-6 py-12 text-primary-foreground sm:px-12">
            <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-semibold tracking-tight">Find the creators your customers already follow.</h2>
                <p className="flex items-center gap-2 text-sm">
                  <Wallet className="size-4" aria-hidden />
                  You set the price. Klynt takes 1%. Pay on verified views.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="h-11 bg-white px-5 text-base text-[oklch(0.42_0.19_280)] hover:bg-white/90">
                  <Link href="/login">Start a campaign</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 border-white/60 bg-transparent px-5 text-base text-primary-foreground hover:bg-white/10 hover:text-primary-foreground dark:bg-transparent">
                  <Link href="/business">Try the demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo className="text-foreground" />
          <p>© 2026 Klynt. Demo data is simulated.</p>
        </div>
      </footer>
    </div>
  );
}
