"use client";

import { useMemo, useState } from "react";
import { CreditCard, FileText, Plug, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PLATFORM_ORDER, PLATFORMS, PlatformIcon } from "@/components/platform-icon";
import { useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { shortDate, usd } from "@/lib/domain/format";
import { PLATFORM_FEE_RATE } from "@/lib/domain/matching";
import { campaignRollup, payment, sum } from "@/lib/domain/metrics";
import { BUSINESS } from "@/lib/domain/seed";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { StatusPill } from "@/components/app/status-badge";
import { Segmented } from "@/components/app/trend-chart";

type Tab = "brand" | "team" | "billing" | "integrations";

export function Settings() {
  const [tab, setTab] = useState<Tab>("brand");
  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 sm:px-8 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Brand details, team, payments and integrations.</p>
      </div>
      <Segmented value={tab} onChange={setTab} options={[["brand", "Brand"], ["team", "Team"], ["billing", "Payments & billing"], ["integrations", "Integrations"]]} />
      {tab === "brand" && <Brand />}
      {tab === "team" && <Team />}
      {tab === "billing" && <Billing />}
      {tab === "integrations" && <Integrations />}
    </div>
  );
}

function Card({ title, description, children, action }: { title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="surface">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Brand() {
  return (
    <Card title="Brand" description="Shown to creators on every offer." action={<Button size="sm" onClick={() => toast("Saved (demo)")}>Save</Button>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm"><span className="font-medium">Brand name</span><Input defaultValue={BUSINESS.name} className="h-9" /></label>
        <label className="space-y-1.5 text-sm"><span className="font-medium">Website</span><Input defaultValue={BUSINESS.website} className="h-9" /></label>
        <label className="space-y-1.5 text-sm">
          <span className="font-medium">Industry</span>
          <Select defaultValue="beauty">
            <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beauty">Beauty & skincare</SelectItem>
              <SelectItem value="food">Food & beverage</SelectItem>
              <SelectItem value="fitness">Fitness & wellness</SelectItem>
              <SelectItem value="tech">Consumer tech</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-1.5 text-sm"><span className="font-medium">Brand handle</span><Input defaultValue="@glowinc" className="h-9" /></label>
        <label className="space-y-1.5 text-sm sm:col-span-2"><span className="font-medium">About the brand</span><Input defaultValue={BUSINESS.tagline} className="h-9" /></label>
        <div className="sm:col-span-2">
          <span className="text-sm font-medium">Brand assets</span>
          <button type="button" onClick={() => toast("Upload (demo)")} className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-muted/40">
            <Upload className="size-4" /> Logos, product shots and brand guidelines
          </button>
        </div>
      </div>
    </Card>
  );
}

function Team() {
  const team = [
    [BUSINESS.user.name, BUSINESS.user.email, "Owner"],
    ["Priya Nair", "priya@glowinc.co", "Marketing manager"],
    ["Sam Ortiz", "sam@glowinc.co", "Approver"],
  ];
  return (
    <Card title="Team" description="Who can launch campaigns and approve creators and content." action={<Button size="sm" variant="outline" onClick={() => toast("Invite sent (demo)")}><UserPlus />Invite</Button>}>
      <ul className="divide-y">
        {team.map(([name, email, role]) => (
          <li key={email} className="flex items-center gap-3 py-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{name.split(" ").map((n) => n[0]).join("")}</span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">{email}</span></span>
            <span className="text-xs text-muted-foreground">{role}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 space-y-3 border-t pt-4">
        {(
          [
            ["Content reviews", "Notify when a creator submits a draft", true],
            ["Replacements", "Notify when a creator declines and a replacement is ready", true],
            ["Delivery guarantee", "Notify when a campaign is projected to fall short", true],
            ["Weekly summary", "Monday digest of views, spend and results", false],
          ] as const
        ).map(([t, d, on]) => (
          <label key={t} className="flex items-center justify-between gap-4">
            <span><span className="block text-sm font-medium">{t}</span><span className="block text-xs text-muted-foreground">{d}</span></span>
            <Switch defaultChecked={on} />
          </label>
        ))}
      </div>
    </Card>
  );
}

function Billing() {
  const world = useAppState();
  const d = useMemo(() => {
    const own = world.campaigns.filter((c) => c.businessId === BUSINESS.id);
    const ids = new Set(own.map((c) => c.id));
    const payouts = world.activations
      .filter((a) => ids.has(a.campaignId) && a.status === "accepted")
      .map((a) => ({ a, c: own.find((c) => c.id === a.campaignId)!, pay: payment(a, world.posts) }));
    const paid = payouts.filter((p) => p.pay.state === "paid" && !p.a.supplementary);
    const months = [...new Set(paid.map((p) => p.pay.paidAt!.slice(0, 7)))].sort().reverse();
    const invoices = months.map((m) => {
      const rows = paid.filter((p) => p.pay.paidAt!.startsWith(m));
      const fees = sum(rows.map((p) => p.a.fee));
      return { month: m, fees, platform: Math.round(fees * PLATFORM_FEE_RATE), creators: rows.length };
    });
    const rollups = own.map((c) => campaignRollup(c, world));
    return { payouts, invoices, budget: sum(own.filter((c) => c.status !== "draft" && c.status !== "completed").map((c) => c.budget)), committed: sum(rollups.map((r) => r.committed)), spent: sum(rollups.map((r) => r.spent)) };
  }, [world]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 @3xl/main:grid-cols-4">
        {(
          [
            ["Authorized budget", usd(d.budget), "Active campaigns"],
            ["Committed", usd(d.committed), "Accepted creator fees + platform fee"],
            ["Charged", usd(d.spent), "Charged as posts are verified"],
            ["Refunds & credits", usd(0), "No make-good credits issued"],
          ] as const
        ).map(([k, v, sub]) => (
          <div key={k} className="surface p-4">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{v}</div>
            <div className="text-[11px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      <Card title="Payment method" description="Campaign budgets are authorized at launch and charged as each creator's posts are verified.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><CreditCard className="size-5 text-muted-foreground" /></span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="font-medium">Card on file (demo)</div>
            <div className="text-xs text-muted-foreground">Managed by our payments provider. Creator payouts run through a licensed marketplace payments partner.</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => toast("Opens the payments provider's secure page (demo)")}>Update</Button>
        </div>
      </Card>

      <Card title="Invoices">
        {d.invoices.length ? (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr><th className="pb-2 text-left font-medium">Period</th><th className="pb-2 text-right font-medium">Creator fees</th><th className="pb-2 text-right font-medium">Platform fee</th><th className="pb-2 text-right font-medium">Total</th><th /></tr>
            </thead>
            <tbody className="divide-y">
              {d.invoices.map((i) => (
                <tr key={i.month}>
                  <td className="py-2.5">{new Date(`${i.month}-01T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })} <span className="text-xs text-muted-foreground">· {i.creators} creators</span></td>
                  <td className="py-2.5 text-right tabular-nums">{usd(i.fees)}</td>
                  <td className="py-2.5 text-right tabular-nums">{usd(i.platform)}</td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{usd(i.fees + i.platform)}</td>
                  <td className="py-2.5 text-right"><Button size="xs" variant="ghost" onClick={() => toast("Invoice PDF (demo)")}><FileText />PDF</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        )}
      </Card>

      <Card title="Creator payouts" description="Each creator is paid their fixed fee once their posts are verified, regardless of view count.">
        <ul className="divide-y">
          {d.payouts.map(({ a, c, pay }) => {
            const creator = creatorById(a.creatorId)!;
            return (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                <CreatorPhoto creator={creator} size={28} />
                <span className="min-w-0 flex-1"><span className="block font-medium">{creator.name}</span><span className="block truncate text-xs text-muted-foreground">{c.name}</span></span>
                {a.supplementary ? <StatusPill tone="neutral">Covered by guarantee</StatusPill> : pay.state === "paid" ? <StatusPill tone="success">Paid {shortDate(pay.paidAt!)}</StatusPill> : pay.state === "processing" ? <StatusPill tone="brand">Verifying</StatusPill> : <StatusPill tone="neutral">Due on verification</StatusPill>}
                <span className={cn("w-16 text-right tabular-nums", a.supplementary && "text-muted-foreground line-through")}>{usd(a.fee)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">Problem with a delivery or charge?</span>
          <Button size="sm" variant="outline" onClick={() => toast("Dispute form (demo)")}>Open a dispute</Button>
        </div>
      </Card>
    </div>
  );
}

function Integrations() {
  const [on, setOn] = useState<Record<string, boolean>>({ shopify: true, ga: true });
  const items: [string, string, string, React.ReactNode][] = [
    ...PLATFORM_ORDER.map((p) => [p, PLATFORMS[p].label, "Verify creator posts and organic views via the platform API", <PlatformIcon key={p} platform={p} className="size-5" />] as [string, string, string, React.ReactNode]),
    ["shopify", "Shopify", "Attribute promo-code and tracked-link purchases", <Plug key="s" className="size-5 text-muted-foreground" />],
    ["ga", "Google Analytics", "Attribute UTM link visits and signups", <Plug key="g" className="size-5 text-muted-foreground" />],
    ["appsflyer", "AppsFlyer", "Attribute app installs", <Plug key="a" className="size-5 text-muted-foreground" />],
    ["slack", "Slack", "Send inbox items to a channel", <Plug key="sl" className="size-5 text-muted-foreground" />],
  ];
  return (
    <Card title="Integrations" description="Verified delivery comes from platform APIs. Business results are attributed through these tools and labelled as attributed.">
      <ul className="divide-y">
        {items.map(([id, name, desc, icon]) => {
          const connected = on[id] ?? PLATFORM_ORDER.includes(id as never);
          return (
            <li key={id} className="flex items-center gap-3 py-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-muted">{icon}</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{name}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
              {connected ? <StatusPill tone="success">Connected</StatusPill> : (
                <Button size="sm" variant="outline" onClick={() => { setOn((o) => ({ ...o, [id]: true })); toast(`${name} connected (demo)`); }}>Connect</Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
