"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, Briefcase, ChevronDown, Inbox, LogOut, RotateCcw, UserRoundPen, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { actions, useAppState } from "@/lib/store";
import { CREATORS } from "@/lib/domain/creators";
import { NICHE_LABEL } from "@/lib/domain/labels";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { setCreatorId, useCurrentCreator } from "./creator-context";
import { effectiveStatus, useCreatorItems } from "./creator-data";

const NAV = [
  { href: "/creator", label: "Inbox", icon: Inbox, match: (p: string) => p === "/creator" || p.startsWith("/creator/offers") },
  { href: "/creator/work", label: "Work", icon: Briefcase, match: (p: string) => p.startsWith("/creator/work") },
  { href: "/creator/earnings", label: "Earnings", icon: Wallet, match: (p: string) => p.startsWith("/creator/earnings") || p.startsWith("/creator/onboarding") },
] as const;

function useNavBadges() {
  const creator = useCurrentCreator();
  const d = useCreatorItems(creator.id);
  return { Inbox: d.totals.open, Work: d.todo, Earnings: 0 } as Record<string, number>;
}

export function CreatorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4 sm:px-6">
          <Link href="/creator" className="flex items-center gap-2 rounded-lg font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50" aria-label="Creator Connect inbox">
            <LogoMark />
            <span className="hidden text-[15px] lg:inline">Creator Connect</span>
          </Link>
          <Suspense fallback={<div className="hidden flex-1 md:block" />}>
            <DesktopNav />
          </Suspense>
          <div className="ml-auto flex items-center gap-1">
            <Button asChild variant="ghost" className="hidden h-8 text-muted-foreground md:inline-flex">
              <Link href="/business">
                <ArrowLeftRight />
                Business view
              </Link>
            </Button>
            <CreatorSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-28 sm:px-6 md:pt-8 md:pb-16">{children}</main>
      <Suspense fallback={null}>
        <BottomTabs />
      </Suspense>
    </div>
  );
}

function DesktopNav() {
  const pathname = usePathname();
  const badges = useNavBadges();
  return (
    <nav aria-label="Creator" className="ml-4 hidden items-center gap-1 md:flex">
      {NAV.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
              active && "bg-card text-foreground shadow-card ring-1 ring-border"
            )}
          >
            <Icon className={cn("size-4", active && "text-primary")} />
            {item.label}
            {badges[item.label] > 0 && (
              <span className="min-w-5 rounded-md bg-primary/10 px-1.5 text-center text-[11px] font-semibold text-primary tabular-nums">
                {badges[item.label]}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function BottomTabs() {
  const pathname = usePathname();
  const badges = useNavBadges();
  return (
    <nav
      aria-label="Creator"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          const count = badges[item.label];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={count ? `${item.label}, ${count} need attention` : item.label}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-muted",
                  active && "text-foreground"
                )}
              >
                {active && <span className="absolute inset-x-8 top-0 h-0.5 rounded-full bg-primary" />}
                <span className="relative">
                  <Icon className={cn("size-[22px]", active && "text-primary")} strokeWidth={active ? 2.2 : 1.8} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums ring-2 ring-card">
                      {count}
                    </span>
                  )}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function CreatorSwitcher() {
  const creator = useCurrentCreator();
  const { activations } = useAppState();
  const router = useRouter();

  // Creators who have been sent at least one offer, with their open-offer count.
  const options = useMemo(() => {
    const open = new Map<string, number>();
    const any = new Set<string>();
    for (const a of activations) {
      if (a.status === "recommended" || a.status === "approved" || a.status === "removed") continue;
      any.add(a.creatorId);
      if (effectiveStatus(a) === "invited") open.set(a.creatorId, (open.get(a.creatorId) ?? 0) + 1);
    }
    return CREATORS.filter((c) => any.has(c.id) || c.id === creator.id)
      .map((c) => ({ creator: c, open: open.get(c.id) ?? 0 }))
      .sort((a, b) => b.open - a.open);
  }, [activations, creator.id]);

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // demo mode
    }
    router.push("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viewing as ${creator.name}. Switch creator`}
          className="flex h-9 items-center gap-2 rounded-full border bg-card py-1 pr-2 pl-1 text-left shadow-card transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CreatorPhoto creator={creator} size={26} />
          <span className="min-w-0 leading-tight">
            <span className="block text-[10px] text-muted-foreground">Viewing as</span>
            <span className="block max-w-28 truncate text-xs font-semibold">{creator.name}</span>
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Viewing as (demo)</DropdownMenuLabel>
        <div className="max-h-72 overflow-y-auto">
          <DropdownMenuRadioGroup
            value={creator.id}
            onValueChange={(id) => {
              setCreatorId(id);
              const next = CREATORS.find((c) => c.id === id);
              if (next) toast(`Viewing as ${next.name}`);
            }}
          >
            {options.map(({ creator: c, open }) => (
              <DropdownMenuRadioItem key={c.id} value={c.id} className="gap-2.5 py-1.5">
                <CreatorPhoto creator={c} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{c.name}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {c.handle} · {NICHE_LABEL[c.niches[0]]}
                  </span>
                </span>
                {open > 0 && (
                  <span className="rounded-md bg-primary/10 px-1.5 text-[11px] font-semibold text-primary tabular-nums" aria-label={`${open} new offers`}>
                    {open}
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/creator/onboarding">
            <UserRoundPen />
            Complete your profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/creator/earnings">
            <Wallet />
            Earnings &amp; profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/business">
            <ArrowLeftRight />
            Business view
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            actions.resetDemo();
            toast("Demo data reset");
          }}
        >
          <RotateCcw />
          Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
