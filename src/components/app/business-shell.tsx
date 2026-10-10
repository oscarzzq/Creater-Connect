"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, Bell, ChevronsUpDown, Inbox, LayoutDashboard, LogOut, Megaphone, Menu, Plus, RotateCcw, Search, Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { inboxItems } from "@/lib/domain/metrics";
import { relative } from "@/lib/domain/format";
import { BUSINESS } from "@/lib/domain/seed";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { OverlayProvider } from "./overlays";
import { CreatorPhoto } from "./creator-photo";
import { Photo } from "./photo";

export function useInbox() {
  const world = useAppState();
  return useMemo(() => {
    const items = inboxItems(world, BUSINESS.id);
    return { items, needsAction: items.filter((i) => i.needsAction), unread: items.filter((i) => !world.inbox.read[i.id]) };
  }, [world]);
}

const NAV = [
  { href: "/business", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/business/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/business/inbox", label: "Inbox", icon: Inbox, badge: true },
  { href: "/business/settings", label: "Settings", icon: Settings },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { needsAction } = useInbox();

  async function signOut() {
    try {
      await createClient().auth.signOut();
    } catch {
      // demo mode
    }
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <div className="flex items-center gap-2.5 rounded-lg p-1.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[oklch(0.55_0.15_45)] text-sm font-semibold text-white">G</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{BUSINESS.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{BUSINESS.tagline}</span>
          </span>
        </div>
      </div>
      <nav className="flex-1 px-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
                    active && "bg-card text-foreground shadow-card ring-1 ring-border"
                  )}
                >
                  <item.icon className={cn("size-4", active && "text-primary")} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && needsAction.length > 0 && (
                    <span className="min-w-5 rounded-md bg-primary/10 px-1.5 text-center text-[11px] font-semibold text-primary tabular-nums">{needsAction.length}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="space-y-0.5 border-t p-3">
        <Link href="/creator" onClick={onNavigate} className="flex h-8 items-center gap-2.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
          <ArrowLeftRight className="size-4" />
          Creator view
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mt-1 flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-sidebar-accent">
              <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background">{BUSINESS.user.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{BUSINESS.user.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{BUSINESS.user.email}</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuItem onClick={() => { actions.resetDemo(); toast("Demo data reset"); }}>
              <RotateCcw />
              Reset demo data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function SearchBox() {
  const { campaigns, sets } = useAppState();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const own = campaigns.filter((c) => c.businessId === BUSINESS.id);
  const query = q.trim().toLowerCase();
  const campaignHits = query ? own.filter((c) => `${c.name} ${c.promoting.name}`.toLowerCase().includes(query)).slice(0, 5) : [];
  const setHits = query ? sets.filter((s) => own.some((c) => c.id === s.campaignId) && s.name.toLowerCase().includes(query)).slice(0, 5) : [];
  const go = (href: string) => {
    router.push(href);
    setQ("");
  };
  return (
    <Popover open={open && !!query} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search campaigns and creator sets"
            className="h-8 w-full rounded-lg border bg-card pr-3 pl-8 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-1" onOpenAutoFocus={(e) => e.preventDefault()}>
        {campaignHits.length + setHits.length === 0 && <p className="px-2 py-4 text-center text-sm text-muted-foreground">No results</p>}
        {campaignHits.length > 0 && <div className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground">Campaigns</div>}
        {campaignHits.map((c) => (
          <button key={c.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent" onClick={() => go(`/business/campaigns/${c.id}`)}>
            <span className="relative size-5 overflow-hidden rounded">
              <Photo src={c.promoting.image} alt="" sizes="40px" />
            </span>
            {c.name}
          </button>
        ))}
        {setHits.length > 0 && <div className="px-2 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">Creator sets</div>}
        {setHits.map((s) => (
          <button key={s.id} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent" onClick={() => go(`/business/campaigns/${s.campaignId}?tab=sets&set=${s.id}`)}>
            {s.name}
            <span className="truncate text-xs text-muted-foreground">{own.find((c) => c.id === s.campaignId)?.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function Notifications() {
  const { needsAction } = useInbox();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          {needsAction.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive ring-2 ring-canvas" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Needs action</span>
          <Link href="/business/inbox" className="text-xs font-medium text-primary hover:underline">
            Open inbox
          </Link>
        </div>
        <ul className="max-h-80 divide-y overflow-y-auto">
          {needsAction.slice(0, 6).map((i) => {
            const creator = i.creatorId ? creatorById(i.creatorId) : undefined;
            return (
              <li key={i.id}>
                <Link href={`/business/inbox?item=${i.id}`} className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-accent">
                  {creator ? <CreatorPhoto creator={creator} size={28} /> : <span className="size-7 rounded-full bg-muted" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{i.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{i.body}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{relative(i.at)}</span>
                </Link>
              </li>
            );
          })}
          {needsAction.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <OverlayProvider>
      <div className="flex min-h-dvh bg-canvas">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 border-r bg-sidebar lg:block">
          <Suspense fallback={null}>
            <Sidebar />
          </Suspense>
        </aside>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Suspense fallback={null}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </Suspense>
          </SheetContent>
        </Sheet>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu />
            </Button>
            <LogoMark className="hidden size-6 lg:inline-flex" />
            <SearchBox />
            <div className="ml-auto flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="hidden h-6 cursor-default items-center gap-1.5 rounded-md border border-dashed px-2 text-[11px] font-medium text-muted-foreground md:inline-flex">
                    <span className="size-1.5 rounded-full bg-warning" />
                    Demo data
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-64">Sample data. Verified = platform-confirmed organic views; Attributed = clicks/codes; Estimate = projections.</TooltipContent>
              </Tooltip>
              <Notifications />
              <ThemeToggle />
              <Button asChild className="ml-1 h-8">
                <Link href="/business/campaigns/new">
                  <Plus />
                  <span className="hidden sm:inline">Create campaign</span>
                </Link>
              </Button>
            </div>
          </header>
          <main className="@container/main flex-1">{children}</main>
        </div>
      </div>
    </OverlayProvider>
  );
}
