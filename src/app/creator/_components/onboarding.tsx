"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, Eye, Landmark, Lock, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChipToggle } from "@/components/chip";
import { PLATFORMS, PLATFORM_ORDER, PlatformTile, type Platform } from "@/components/platform-icon";
import { useCurrentCreator } from "@/components/creator/creator-context";
import { COUNTRY_NAMES } from "@/lib/domain/format";
import { NICHES } from "@/lib/domain/labels";
import type { Creator, NicheId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "accounts", label: "Accounts" },
  { key: "profile", label: "Profile" },
  { key: "payouts", label: "Payouts" },
  { key: "metrics", label: "Metrics" },
  { key: "done", label: "Done" },
] as const;

const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "German", "Hindi", "Korean"];

export function Onboarding() {
  const creator = useCurrentCreator();
  // Remount when the "viewing as" creator changes so the form is prefilled for them.
  return <OnboardingFlow key={creator.id} creator={creator} />;
}

function OnboardingFlow({ creator }: { creator: Creator }) {
  const [step, setStep] = useState(0);
  const [connected, setConnected] = useState<Platform[]>(creator.platforms.map((p) => p.platform));
  const [niches, setNiches] = useState<NicheId[]>(creator.niches);
  const [primary, setPrimary] = useState<Platform[]>(creator.platforms.map((p) => p.platform));
  const [city, setCity] = useState(creator.city);
  const [country, setCountry] = useState(creator.country);
  const [languages, setLanguages] = useState<string[]>(creator.languages);
  const [stripe, setStripe] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const cityId = useId();
  const authId = useId();

  const canContinue = [
    connected.length > 0,
    niches.length > 0 && primary.length > 0 && city.trim().length > 0 && languages.length > 0,
    true, // payouts can be connected later
    authorized,
    true,
  ][step];

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function next() {
    if (step === 3) toast.success("Metrics access granted", { description: "Read-only. You can revoke it anytime." });
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <Link href="/creator/earnings" className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
          <ArrowLeft className="size-4" />
          Earnings &amp; profile
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Set up your creator profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Takes about two minutes. Brands only ever see your stats, never your logins.</p>
      </header>

      <ol className="flex items-center gap-1.5" aria-label="Setup progress">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={cn("h-1 rounded-full", i < step ? "bg-success" : i === step ? "bg-primary" : "bg-muted")} />
            <span className={cn("truncate text-[11px] font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
              <span className="sr-only">{i < step ? " (done)" : i === step ? " (current)" : ""}</span>
            </span>
          </li>
        ))}
      </ol>

      <section className="surface p-4 sm:p-6">
        {step === 0 && (
          <div className="space-y-4">
            <StepTitle title="Connect your social accounts" body="We read your last 20 organic videos to price offers fairly, and your audience demographics to match you with brands." />
            <ul className="space-y-2">
              {PLATFORM_ORDER.map((p) => {
                const on = connected.includes(p);
                return (
                  <li key={p} className="flex items-center gap-3 rounded-xl border p-3">
                    <PlatformTile platform={p} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{PLATFORMS[p].label}</div>
                      <div className="text-xs text-muted-foreground">{on ? "Connected · read-only" : "Not connected"}</div>
                    </div>
                    {on ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success-text">
                        <BadgeCheck className="size-4" />
                        Connected
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConnected((c) => [...c, p]);
                          setPrimary((x) => (x.includes(p) ? x : [...x, p]));
                          toast.success(`${PLATFORMS[p].label} connected`, { description: "Demo: no real sign-in happens." });
                        }}
                      >
                        Continue with {PLATFORMS[p].short}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <StepTitle title="Your profile" body="Used to match you with campaigns. You can change it anytime." />
            <Field label="What do you make content about?" hint="Pick all that apply. Your first pick is your primary niche.">
              <div role="group" aria-label="Niches" className="flex flex-wrap gap-1.5">
                {NICHES.map((n) => (
                  <ChipToggle key={n.id} pressed={niches.includes(n.id)} onPressedChange={() => setNiches((x) => toggle(x, n.id))}>
                    {niches.includes(n.id) && <Check />}
                    {n.label}
                  </ChipToggle>
                ))}
              </div>
            </Field>
            <Field label="Primary platforms">
              <div role="group" aria-label="Primary platforms" className="flex flex-wrap gap-1.5">
                {PLATFORM_ORDER.map((p) => (
                  <ChipToggle key={p} pressed={primary.includes(p)} onPressedChange={() => setPrimary((x) => toggle(x, p))}>
                    {PLATFORMS[p].label}
                    {!connected.includes(p) && <span className="text-[11px] text-muted-foreground">(not connected)</span>}
                  </ChipToggle>
                ))}
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor={cityId} className="text-xs text-muted-foreground">
                  City
                </Label>
                <Input id={cityId} value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" className="mt-1.5 h-10" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground" id={`${cityId}-country`}>
                  Country
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="mt-1.5 h-10! w-full" aria-labelledby={`${cityId}-country`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Field label="Languages you post in">
              <div role="group" aria-label="Languages" className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <ChipToggle key={l} pressed={languages.includes(l)} onPressedChange={() => setLanguages((x) => toggle(x, l))}>
                    {languages.includes(l) && <Check />}
                    {l}
                  </ChipToggle>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <StepTitle title="Get paid" body="Payouts are handled by Stripe. You add your bank details on Stripe's secure page; Creator Connect never sees or stores them." />
            <div className="flex items-center gap-3 rounded-xl border p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Landmark className="size-5 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-medium">Stripe payouts</div>
                <div className="text-xs text-muted-foreground">{stripe ? "Connected" : "Paid out within 2 business days of verification"}</div>
              </div>
              {stripe ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success-text">
                  <BadgeCheck className="size-4" />
                  Connected
                </span>
              ) : (
                <Button
                  onClick={() => {
                    setStripe(true);
                    toast.success("Stripe connected", { description: "Demo: Stripe's onboarding would open in a new window." });
                  }}
                >
                  Connect with Stripe
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">You can skip this for now. You&apos;ll need it before your first payout.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <StepTitle title="Authorize metrics access" body="We verify your posts and measure organic views straight from the platform. That's how brands trust the numbers and how you get paid." />
            <ul className="space-y-2 text-sm">
              {[
                { icon: Eye, text: "Read view counts and engagement on your posts" },
                { icon: Eye, text: "Read audience demographics (age, gender, country)" },
                { icon: Lock, text: "We never post, comment or message on your behalf" },
              ].map((r) => (
                <li key={r.text} className="flex gap-2.5">
                  <r.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {r.text}
                </li>
              ))}
            </ul>
            <div className="flex items-start gap-2.5 rounded-xl border p-3">
              <Checkbox id={authId} checked={authorized} onCheckedChange={(v) => setAuthorized(v === true)} className="mt-0.5" />
              <Label htmlFor={authId} className="text-sm leading-snug font-normal">
                I authorize Creator Connect to read my view, engagement and audience metrics on connected accounts (read-only). I can revoke access anytime.
              </Label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col items-center py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-success-subtle text-success-text">
              <PartyPopper className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">You&apos;re all set</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {connected.length} {connected.length === 1 ? "account" : "accounts"} connected · {niches.length} {niches.length === 1 ? "niche" : "niches"}
              {stripe ? " · payouts ready" : " · connect payouts before your first payout"}. Offers land in your inbox as brands match with you.
            </p>
            <Button asChild className="mt-5 h-11 rounded-xl px-5">
              <Link href="/creator">
                Go to your inbox
                <ArrowRight />
              </Link>
            </Button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-6 flex items-center justify-between gap-2 border-t pt-4">
            <Button variant="ghost" className="h-10" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              <ArrowLeft />
              Back
            </Button>
            <Button className="h-10" disabled={!canContinue} onClick={next}>
              {step === 2 && !stripe ? "Skip for now" : "Continue"}
              <ArrowRight />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

function StepTitle({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
