import { Check, Film, Play } from "lucide-react";
import { Photo } from "@/components/app/photo";
import { StatusPill } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";

// Screens, code and hardware shots only: no people or faces in the previews.
export const POSTS = [
  { image: "t-ai", initials: "LM", handle: "@lena.ml", views: "128K", duration: "0:24" },
  { image: "t-servers", initials: "SS", handle: "@systems.sam", views: "86K", duration: "0:31" },
  { image: "t-security", initials: "NT", handle: "@noor.threatintel", views: "214K", duration: "0:18" },
];

function VerifiedTag() {
  return (
    <span className="inline-flex h-4 items-center bg-success-subtle px-1 text-[10px] font-medium tracking-wide text-success-text uppercase">
      Verified
    </span>
  );
}

export function VideoThumbnail({ post, className }: { post: (typeof POSTS)[number]; className?: string }) {
  return (
    <div className={cn("flex w-48 shrink-0 snap-start flex-col border bg-card text-card-foreground lg:w-auto", className)}>
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        <Photo src={post.image} alt="" sizes="(min-width: 1024px) 18vw, 192px" />
        <div className="absolute inset-x-2 top-2 flex items-center justify-between text-[11px] font-medium text-white">
          <span className="inline-flex items-center gap-1 bg-black/70 px-1.5 py-0.5">
            <Film className="size-3" />
            Video
          </span>
          <span className="bg-black/70 px-1.5 py-0.5 tabular-nums">{post.duration}</span>
        </div>
        <span className="absolute top-1/2 left-1/2 grid size-10 -translate-1/2 place-items-center bg-white">
          <Play className="ml-0.5 size-4 fill-foreground text-foreground" />
        </span>
      </div>
      <div className="flex flex-col gap-1 border-t px-2.5 py-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="grid size-5 shrink-0 place-items-center bg-brand-subtle text-[9px] font-semibold text-brand-subtle-foreground">
            {post.initials}
          </span>
          <span className="truncate text-sm font-medium">{post.handle}</span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="whitespace-nowrap tabular-nums">{post.views} views</span>
          <VerifiedTag />
        </span>
      </div>
    </div>
  );
}

export function CampaignCard() {
  return (
    <div className="flex flex-col gap-4 border bg-card p-5 text-card-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center bg-warning-subtle text-sm font-medium text-warning-text">K</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-base font-semibold">Kestrel 2 Launch</span>
          <span className="text-xs text-muted-foreground">Kestrel AI · 12 creators</span>
        </span>
        <StatusPill tone="success">Live</StatusPill>
      </div>
      <dl className="grid grid-cols-3 border-y">
        {[
          { value: "482K", label: "Views", verified: true },
          { value: "12 / 15", label: "Accepted" },
          { value: "$0.67", label: "Per 100 views" },
        ].map((k, i) => (
          <div key={k.label} className={cn("flex min-w-0 flex-col-reverse gap-0.5 py-3", i > 0 && "border-l pl-3")}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {k.label}
              {k.verified && <VerifiedTag />}
            </dt>
            <dd className="text-xl font-semibold tracking-tight tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Budget used</span>
          <span className="tabular-nums">$3,240 of $5,000</span>
        </div>
        <div className="h-1.5 bg-muted">
          <div className="h-full w-[65%] bg-primary" />
        </div>
      </div>
    </div>
  );
}

export function PayoutNotification() {
  return (
    // Toasts float above content, so this is the one place a shadow earns its keep
    <div className="flex items-center gap-3 border bg-card px-3.5 py-3 text-card-foreground shadow-float">
      <span className="grid size-9 shrink-0 place-items-center bg-success-subtle text-success-text">
        <Check className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium tabular-nums">Payout sent · $450.00</span>
        <span className="truncate text-xs text-muted-foreground">@lena.ml · Kestrel 2 Launch</span>
      </span>
      <span className="text-xs text-muted-foreground">now</span>
    </div>
  );
}

/** Brand panel for auth pages: value prop + product moments. Flat, square, no shadows. */
export function AuthShowcase() {
  return (
    <aside className="bg-primary px-6 py-10 text-primary-foreground sm:px-12 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-1 lg:flex-col lg:justify-center lg:px-12 lg:py-16 xl:px-16">
      <div className="mx-auto flex w-full max-w-[672px] flex-col gap-8 lg:gap-10">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-semibold tracking-tight lg:text-[2.5rem] lg:leading-[3rem] lg:tracking-[-0.025em]">
            Reach the right audience through the right creators.
          </h2>
          <p className="text-sm">
            Brief once. Our matching engine finds trusted industry creators your customers already follow, sends fixed-fee offers in one click, and pays out only on verified views.
          </p>
        </div>

        {/* Illustrative product preview */}
        <div aria-hidden className="flex flex-col gap-4">
          <div className="-mx-6 flex snap-x scroll-px-6 gap-3 overflow-x-auto px-6 scrollbar-none sm:-mx-12 sm:scroll-px-12 sm:px-12 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0">
            {POSTS.map((post) => (
              <VideoThumbnail key={post.handle} post={post} />
            ))}
          </div>
          <div className="grid items-start gap-4 xl:grid-cols-2">
            <CampaignCard />
            <PayoutNotification />
          </div>
        </div>
      </div>
    </aside>
  );
}
