"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, ArrowRight, Bot, Check, Clapperboard, Copy, Folder, Hand, LayoutGrid, MoreHorizontal, Plus, Rocket, Trash2, UserMinus, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { SelectableCard } from "@/components/selectable-card";
import { PlatformIconRow } from "@/components/platform-icon";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { PostCard } from "@/components/app/post-card";
import { ActivationBadge, DataTag } from "@/components/app/status-badge";
import { useOverlays } from "@/components/app/overlays";
import { createCampaign } from "@/app/actions/campaigns";
import { actions, useAppState } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, shortDate, usd } from "@/lib/domain/format";
import { OBJECTIVES } from "@/lib/domain/labels";
import { briefFor, guaranteeFloor } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import type { CreatorSet, Objective } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CampaignForm } from "./campaign-form";
import { SetForm } from "./set-form";
import { AdForm } from "./ad-form";
import { AdPanel, CampaignPanel, CreatorPanel, SetPanel, setForecast } from "./side-panels";
import { adErrors, campaignErrors, freshId, newCampaignDraft, newSet, nodeKey, parseNode, setErrors, withFreshIds, type EditorDraft, type Node } from "./editor-state";

export function CampaignEditor({ mode, initial, initialNode }: { mode: "create" | "edit"; initial?: EditorDraft; initialNode?: Node | null }) {
  const router = useRouter();
  const world = useAppState();
  const [draft, setDraft] = useState<EditorDraft | null>(initial ?? null);
  const [node, setNode] = useState<Node>(initialNode ?? { type: "campaign" });
  const [publishOpen, setPublishOpen] = useState(false);

  if (!draft) return <ObjectiveDialog onStart={(objective, selection) => setDraft(newCampaignDraft(objective, selection))} />;

  const c = draft.campaign;
  const live = mode === "edit" && c.status !== "draft";
  const acts = mode === "edit" ? world.activations.filter((a) => a.campaignId === c.id && a.status !== "removed") : [];
  const budgets = Object.fromEntries(draft.sets.map((s) => [s.id, c.allocation === "manual" && s.budget ? s.budget : Math.round(c.budget / Math.max(1, draft.sets.length))]));
  const original = mode === "edit" ? JSON.stringify({ campaign: world.campaigns.find((x) => x.id === c.id), sets: world.sets.filter((s) => s.campaignId === c.id) }) : "";
  const dirty = mode === "edit" && JSON.stringify(draft) !== original;

  const setCampaign = (fn: (x: EditorDraft["campaign"]) => EditorDraft["campaign"]) => setDraft((d) => d && { ...d, campaign: fn(d.campaign) });
  const patchSet = (id: string, p: Partial<CreatorSet>) => setDraft((d) => d && { ...d, sets: d.sets.map((s) => (s.id === id ? { ...s, ...p } : s)) });

  const order: Node[] = [{ type: "campaign" }, ...draft.sets.flatMap((s) => [{ type: "set", id: s.id } as Node, { type: "ad", setId: s.id } as Node])];
  const idx = order.findIndex((n) => nodeKey(n) === nodeKey(node));
  const errors = [...campaignErrors(c), ...draft.sets.flatMap((s) => [...setErrors(s), ...adErrors(c, s)].map((e) => `${s.name}: ${e}`))];

  function addSet(copyOf?: CreatorSet) {
    const id = freshId("set");
    const base = copyOf ? { ...copyOf, id, name: `${copyOf.name} (copy)`, hypothesis: "" } : newSet(c.id, draft!.sets.length, draft!.sets[0]?.selection ?? "automatic", id);
    setDraft((d) => d && { ...d, sets: [...d.sets, base] });
    setNode({ type: "set", id });
  }

  function removeSet(id: string) {
    if (draft!.sets.length === 1) return toast("A campaign needs at least one creator set");
    if (acts.some((a) => a.setId === id && a.status === "accepted")) return toast("Creators in this set have accepted. Remove isn't available, but you can stop new invitations by excluding creators.");
    setDraft((d) => d && { ...d, sets: d.sets.filter((s) => s.id !== id) });
    setNode({ type: "campaign" });
  }

  async function publish() {
    if (mode === "create") {
      const saved = withFreshIds(draft!);
      actions.saveCampaign(saved.campaign, saved.sets, []);
      actions.launch(saved.campaign.id);
      try {
        const fd = new FormData();
        fd.set("title", saved.campaign.name);
        fd.set("brief", `${saved.campaign.promoting.name}\n\n${saved.campaign.promoting.description}`);
        fd.set("budget_usd", String(saved.campaign.budget));
        fd.set("niche", saved.sets[0]?.niches[0] ?? "lifestyle");
        fd.set("min_followers", "0");
        fd.set("max_payout_usd", String(saved.sets[0]?.maxFee ?? 1000));
        await createCampaign(fd);
      } catch {
        // not signed in: demo mode
      }
      toast.success(`${saved.campaign.name} published`, { description: "Creators are being invited. Manual sets have recommendations waiting for you." });
      router.push(`/business/campaigns/${saved.campaign.id}`);
    } else {
      actions.applyEdits(draft!.campaign, draft!.sets);
      if (c.status === "draft") actions.launch(c.id);
      toast.success(c.status === "draft" ? `${c.name} published` : "Changes published", { description: live ? "Targeting changes apply to future invitations. Accepted fees never change." : undefined });
      router.push(`/business/campaigns/${c.id}`);
    }
    setPublishOpen(false);
  }

  function saveDraft() {
    if (mode === "create") {
      const saved = withFreshIds(draft!);
      actions.saveCampaign(saved.campaign, saved.sets, []);
      toast("Draft saved");
      router.push(`/business/campaigns/${saved.campaign.id}`);
    } else {
      actions.applyEdits(draft!.campaign, draft!.sets);
      toast("Draft saved");
    }
  }

  const currentSet = node.type === "set" ? draft.sets.find((s) => s.id === node.id) : node.type === "ad" ? draft.sets.find((s) => s.id === node.setId) : undefined;
  const currentAct = node.type === "creator" ? acts.find((a) => a.id === node.id) : undefined;
  const actSet = currentAct && draft.sets.find((s) => s.id === currentAct.setId);

  return (
    <div className="flex h-dvh flex-col bg-canvas">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-3 sm:px-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={mode === "edit" ? `/business/campaigns/${c.id}` : "/business/campaigns"} aria-label="Close editor">
            <X />
          </Link>
        </Button>
        <span className="h-5 w-px bg-border" />
        <LogoMark className="size-6" />
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-semibold">{c.name || "Untitled campaign"}</span>
          <Badge variant="secondary" className="hidden sm:inline-flex">{c.status === "draft" ? "Draft" : "Editing"}</Badge>
          {dirty && <span className="hidden text-xs text-warning-text sm:inline">Unpublished changes</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {(mode === "create" || c.status === "draft") && (
            <Button variant="outline" className="hidden sm:inline-flex" onClick={saveDraft} disabled={campaignErrors(c).length > 0}>
              Save draft
            </Button>
          )}
        </div>
      </header>

      {/* Compact node switcher: the tree is hidden below lg */}
      <div className="flex shrink-0 items-center gap-2 border-b bg-background px-3 py-2 sm:px-4 lg:hidden">
        <Select value={nodeKey(node)} onValueChange={(v) => { const n = parseNode(v); if (n) setNode(n); }}>
          <SelectTrigger className="h-9 min-w-0 flex-1" aria-label="Jump to campaign, creator set, ad or creator">
            <SelectValue>
              <span className="truncate">
                {node.type === "campaign" ? c.name || "Campaign" : node.type === "creator" ? `${actSet?.name ?? ""} › ${creatorById(currentAct?.creatorId ?? "")?.name ?? ""}` : `${currentSet?.name ?? ""}${node.type === "ad" ? " › Ad" : ""}`}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={nodeKey({ type: "campaign" })}>
              <Folder /> {c.name || "Campaign"}
            </SelectItem>
            {draft.sets.map((s) => (
              <SelectGroup key={s.id}>
                <SelectLabel>{s.name}</SelectLabel>
                <SelectItem value={nodeKey({ type: "set", id: s.id })}>
                  <LayoutGrid /> Creator set settings
                </SelectItem>
                <SelectItem value={nodeKey({ type: "ad", setId: s.id })}>
                  <Clapperboard /> {s.brief ? "Custom creative" : "Ad · default creative"}
                </SelectItem>
                {acts.filter((a) => a.setId === s.id).map((a) => (
                  <SelectItem key={a.id} value={nodeKey({ type: "creator", id: a.id })}>
                    <CreatorPhoto creator={creatorById(a.creatorId)!} size={16} /> {creatorById(a.creatorId)?.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" className="size-9" onClick={() => addSet()} aria-label="New creator set">
          <Plus />
        </Button>
        {errors.length > 0 && (
          <span className="inline-flex h-9 items-center gap-1 rounded-md bg-warning-subtle/60 px-2 text-xs font-medium text-warning-text" title={errors.join("\n")}>
            <AlertCircle className="size-3.5" />
            {errors.length}
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Tree */}
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-background lg:flex">
          <div className="flex-1 overflow-y-auto p-3">
            <TreeItem depth={0} icon={Folder} label={c.name || "Campaign"} sub={OBJECTIVES[c.objective].label} active={node.type === "campaign"} onClick={() => setNode({ type: "campaign" })} error={campaignErrors(c).length > 0} />
            {draft.sets.map((s) => {
              const setActs = acts.filter((a) => a.setId === s.id);
              return (
                <div key={s.id}>
                  <TreeItem
                    depth={1}
                    icon={LayoutGrid}
                    label={s.name}
                    sub={<span className="inline-flex items-center gap-1">{s.selection === "automatic" ? <Bot className="size-3" /> : <Hand className="size-3" />}{s.selection === "automatic" ? "Automatic" : "Manual"} · <PlatformIconRow platforms={s.platforms} className="gap-1 [&_svg]:size-3" /></span>}
                    active={node.type === "set" && node.id === s.id}
                    onClick={() => setNode({ type: "set", id: s.id })}
                    error={setErrors(s).length > 0}
                    menu={
                      <>
                        <DropdownMenuItem onClick={() => addSet(s)}><Copy />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => removeSet(s.id)} disabled={draft.sets.length === 1}><Trash2 />Delete</DropdownMenuItem>
                      </>
                    }
                  />
                  <TreeItem depth={2} icon={Clapperboard} label={s.brief ? "Custom creative" : "Ad · default creative"} sub={`${briefFor(c, s).deliverables} post${briefFor(c, s).deliverables > 1 ? "s" : ""} per creator`} active={node.type === "ad" && node.setId === s.id} onClick={() => setNode({ type: "ad", setId: s.id })} error={adErrors(c, s).length > 0} />
                  {setActs.map((a) => {
                    const cr = creatorById(a.creatorId)!;
                    return (
                      <button key={a.id} onClick={() => setNode({ type: "creator", id: a.id })} className={cn("flex w-full items-center gap-2 rounded-md py-1 pr-2 pl-[68px] text-left text-xs hover:bg-accent", node.type === "creator" && node.id === a.id && "bg-accent")}>
                        <CreatorPhoto creator={cr} size={18} />
                        <span className="min-w-0 flex-1 truncate">{cr.name}</span>
                        <span className={cn("size-1.5 rounded-full", a.status === "accepted" ? "bg-success" : a.status === "invited" ? "bg-primary" : a.status === "recommended" || a.status === "replacement_required" ? "bg-warning" : "bg-muted-foreground/40")} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-muted-foreground" onClick={() => addSet()}>
              <Plus /> New creator set
            </Button>
          </div>
          {errors.length > 0 && (
            <div className="m-3 rounded-lg border border-warning/40 bg-warning-subtle/50 p-3 text-xs">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-warning-text"><AlertCircle className="size-3.5" />{errors.length} to fix before publishing</div>
              <ul className="space-y-0.5 text-muted-foreground">{errors.slice(0, 4).map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
        </aside>

        {/* Main */}
        <main className="@container/main flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[1240px] gap-8 px-4 py-6 sm:px-8">
              <div className="min-w-0 flex-1">
                <div className="mb-5">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {node.type === "campaign" ? "Campaign" : node.type === "set" ? "Creator set (ad set)" : node.type === "ad" ? "Ad · creative brief" : "Creator ad"}
                  </div>
                  <h1 className="mt-1 text-xl font-semibold tracking-tight">
                    {node.type === "campaign" ? c.name || "Untitled campaign" : node.type === "creator" ? creatorById(currentAct?.creatorId ?? "")?.name : currentSet?.name}
                  </h1>
                  {live && node.type === "set" && <p className="mt-1 text-sm text-muted-foreground">Changes apply to future invitations. Creators who already accepted keep their fixed fee.</p>}
                </div>

                {node.type === "campaign" && <CampaignForm campaign={c} onChange={setCampaign} live={live} />}
                {node.type === "set" && currentSet && <SetForm key={currentSet.id} set={currentSet} onChange={(p) => patchSet(currentSet.id, p)} campaign={c} budget={budgets[currentSet.id]} />}
                {node.type === "ad" && currentSet && (
                  <div className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectableCard selected={!currentSet.brief} onSelect={() => patchSet(currentSet.id, { brief: undefined })} className="gap-1 p-3.5">
                        <span className="text-sm font-medium">Use the campaign&apos;s default creative</span>
                        <span className="pr-5 text-xs text-muted-foreground">Edits here update every creator set using the default.</span>
                      </SelectableCard>
                      <SelectableCard selected={!!currentSet.brief} onSelect={() => patchSet(currentSet.id, { brief: currentSet.brief ?? structuredClone(c.brief) })} className="gap-1 p-3.5">
                        <span className="text-sm font-medium">Custom creative for this set</span>
                        <span className="pr-5 text-xs text-muted-foreground">Test a different angle, hooks or CTA with this audience.</span>
                      </SelectableCard>
                    </div>
                    <AdForm
                      key={`${currentSet.id}-${currentSet.brief ? "custom" : "default"}`}
                      brief={briefFor(c, currentSet)}
                      onChange={(p) => (currentSet.brief ? patchSet(currentSet.id, { brief: { ...currentSet.brief, ...p } }) : setCampaign((x) => ({ ...x, brief: { ...x.brief, ...p } })))}
                    />
                  </div>
                )}
                {node.type === "creator" && currentAct && (
                  <CreatorAdForm
                    activationId={currentAct.id}
                    onExcluded={(creatorId, setId) => {
                      // Mirror the store's exclusion so publishing this draft doesn't undo it.
                      setDraft((d) => d && { ...d, sets: d.sets.map((s) => (s.id === setId ? { ...s, excludeCreators: [...new Set([...s.excludeCreators, creatorId])] } : s)) });
                      setNode({ type: "set", id: setId });
                    }}
                  />
                )}
              </div>

              <aside className="hidden w-[300px] shrink-0 xl:block">
                <div className="sticky top-6">
                  {node.type === "campaign" && <CampaignPanel campaign={c} sets={draft.sets} budgets={budgets} live={acts} />}
                  {node.type === "set" && currentSet && <SetPanel campaign={c} set={currentSet} budget={budgets[currentSet.id]} live={acts} />}
                  {node.type === "ad" && currentSet && <AdPanel campaign={c} set={currentSet} />}
                  {node.type === "creator" && currentAct && actSet && <CreatorPanel campaign={c} set={actSet} activation={currentAct} />}
                </div>
              </aside>
            </div>
          </div>

          <footer className="shrink-0 border-t bg-background">
            <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-8">
              <Button variant="outline" className="h-9" onClick={() => setNode(order[Math.max(0, idx - 1)])} disabled={idx <= 0}>
                <ArrowLeft /> Back
              </Button>
              {idx >= 0 && idx < order.length - 1 && (
                <Button variant="outline" className="h-9" onClick={() => setNode(order[idx + 1])}>
                  Next <ArrowRight />
                </Button>
              )}
              <div className="ml-auto flex items-center gap-3">
                {mode === "edit" && c.status !== "draft" ? (
                  <Button className="h-9 px-4" disabled={!dirty || errors.length > 0} onClick={publish}>
                    <Check /> Publish changes
                  </Button>
                ) : (
                  <Button className="h-9 px-4" disabled={errors.length > 0} onClick={() => setPublishOpen(true)}>
                    <Rocket /> Publish
                  </Button>
                )}
              </div>
            </div>
          </footer>
        </main>
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} draft={draft} budgets={budgets} onPublish={publish} />
    </div>
  );
}

function TreeItem({ depth, icon: Icon, label, sub, active, onClick, error, menu }: { depth: number; icon: typeof Folder; label: string; sub?: React.ReactNode; active: boolean; onClick: () => void; error?: boolean; menu?: React.ReactNode }) {
  return (
    <div className={cn("group flex items-center rounded-lg hover:bg-accent", active && "bg-brand-subtle/70 hover:bg-brand-subtle/70")} style={{ paddingLeft: depth * 20 }}>
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left">
        <Icon className={cn("mt-0.5 size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
        <span className="min-w-0">
          <span className={cn("block truncate text-sm", active && "font-semibold")}>{label}</span>
          {sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
        </span>
        {error && <AlertCircle className="mt-0.5 ml-auto size-3.5 shrink-0 text-warning" />}
      </button>
      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="mr-1 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-background focus-visible:opacity-100" aria-label="Creator set actions">
              <MoreHorizontal className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">{menu}</DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** One creator's ad: status, fee, their posts, per-creator instructions and roster actions. */
function CreatorAdForm({ activationId, onExcluded }: { activationId: string; onExcluded: (creatorId: string, setId: string) => void }) {
  const world = useAppState();
  const { openPost, openActivation } = useOverlays();
  const a = world.activations.find((x) => x.id === activationId)!;
  const [notes, setNotes] = useState(a.notes ?? "");
  const creator = creatorById(a.creatorId)!;
  const posts = world.posts.filter((p) => p.activationId === a.id);
  const first = creator.name.split(" ")[0];
  return (
    <div className="space-y-5">
      <section className="surface p-5">
        <div className="flex flex-wrap items-center gap-3">
          <CreatorPhoto creator={creator} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 font-semibold">{creator.name} <ActivationBadge status={a.status} supplementary={a.supplementary} /></div>
            <div className="text-xs text-muted-foreground">{creator.handle} · fit {a.matchScore}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => openActivation(a.id)}>Details & messages</Button>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border text-sm">
          <div className="bg-card p-3"><dt className="text-xs text-muted-foreground">Fixed fee</dt><dd className="font-semibold tabular-nums">{usd(a.fee)}</dd></div>
          <div className="bg-card p-3"><dt className="flex items-center gap-1 text-xs text-muted-foreground">Expected <DataTag kind="estimate" /></dt><dd className="font-semibold tabular-nums">{compact(a.estViews[0])}–{compact(a.estViews[2])}</dd></div>
          <div className="bg-card p-3"><dt className="text-xs text-muted-foreground">{a.invitedAt ? "Invited" : "Status"}</dt><dd className="font-semibold">{a.invitedAt ? shortDate(a.invitedAt) : "Not invited"}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {a.status === "recommended" && (
            <Button size="sm" onClick={() => { actions.approve([a.id]); toast.success(`${first} invited`); }}>
              <Check /> Approve & invite
            </Button>
          )}
          {["recommended", "approved", "invited", "replacement_required"].includes(a.status) && (
            <Button size="sm" variant="outline" onClick={() => { actions.exclude(a.id); onExcluded(a.creatorId, a.setId); toast(`${first} excluded`, { description: "A comparable creator replaces them in automatic sets." }); }}>
              <UserMinus /> Exclude creator
            </Button>
          )}
          {a.status === "accepted" && <p className="text-xs text-muted-foreground">Accepted creators can&apos;t be removed here. Message them for changes, or contact support for disputes.</p>}
        </div>
      </section>

      <section className="surface p-5">
        <h3 className="text-sm font-semibold">Instructions for {first} only</h3>
        <p className="text-xs text-muted-foreground">Added on top of the set&apos;s creative brief, e.g. a specific angle or product shade.</p>
        <Textarea className="mt-3 resize-none" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={`e.g. ${first}, try the PM-routine angle you suggested`} />
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="outline" disabled={notes === (a.notes ?? "")} onClick={() => { actions.setNotes(a.id, notes); toast("Saved and shared with the creator"); }}>
            Save instructions
          </Button>
        </div>
      </section>

      {posts.length > 0 && (
        <section className="surface p-5">
          <h3 className="mb-3 text-sm font-semibold">Posts</h3>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {posts.map((p) => <PostCard key={p.id} post={p} size="sm" onOpen={() => openPost(p.id)} subtitle={p.publishedAt ? `Live ${shortDate(p.publishedAt)}` : `Due ${shortDate(p.dueAt)}`} />)}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Published organic posts can&apos;t be edited. Request changes before approval.</p>
        </section>
      )}
    </div>
  );
}

function ObjectiveDialog({ onStart }: { onStart: (o: Objective, selection: CreatorSet["selection"]) => void }) {
  const router = useRouter();
  const [objective, setObjective] = useState<Objective>("awareness");
  const [selection, setSelection] = useState<CreatorSet["selection"]>("automatic");
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <Dialog open onOpenChange={(o) => !o && router.push("/business/campaigns")}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          <div className="border-b p-5">
            <DialogTitle className="text-lg">Create new campaign</DialogTitle>
            <DialogDescription>Choose a campaign objective and how creators are selected. You can change selection per creator set later.</DialogDescription>
          </div>
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_1fr]">
            <div>
              <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Objective</div>
              <div role="radiogroup" className="space-y-1">
                {(Object.keys(OBJECTIVES) as Objective[]).map((o) => (
                  <button key={o} type="button" role="radio" aria-checked={objective === o} onClick={() => setObjective(o)} className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent", objective === o && "bg-brand-subtle font-medium")}>
                    <span className={cn("flex size-4 items-center justify-center rounded-full border", objective === o && "border-primary bg-primary")}>{objective === o && <span className="size-1.5 rounded-full bg-white" />}</span>
                    {OBJECTIVES[o].label}
                  </button>
                ))}
              </div>
              <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                {OBJECTIVES[objective].description} Measured by {OBJECTIVES[objective].tracking.toLowerCase()}.
              </p>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Creator selection</div>
              <div className="space-y-2">
                <SelectableCard selected={selection === "automatic"} onSelect={() => setSelection("automatic")} className="gap-1 p-3.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Bot className="size-4 text-primary" />Automatic <span className="rounded bg-brand-subtle px-1.5 py-0.5 text-[10px] font-semibold text-brand-subtle-foreground">Recommended</span></span>
                  <span className="pr-5 text-xs text-muted-foreground">Set your audience, budget and max fee. We find, invite and replace creators for you.</span>
                </SelectableCard>
                <SelectableCard selected={selection === "manual"} onSelect={() => setSelection("manual")} className="gap-1 p-3.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><Hand className="size-4 text-muted-foreground" />Manual review</span>
                  <span className="pr-5 text-xs text-muted-foreground">We recommend creators; you approve each one before offers go out.</span>
                </SelectableCard>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t p-4">
            <Button variant="outline" asChild><Link href="/business/campaigns">Cancel</Link></Button>
            <Button onClick={() => onStart(objective, selection)}>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PublishDialog({ open, onOpenChange, draft, budgets, onPublish }: { open: boolean; onOpenChange: (o: boolean) => void; draft: EditorDraft; budgets: Record<string, number>; onPublish: () => void }) {
  const world = useAppState();
  const c = draft.campaign;
  const acts = world.activations.filter((a) => a.campaignId === c.id && a.status !== "removed");
  const f = useMemo(() => (open ? draft.sets.map((s) => ({ s, ...setForecast(c, s, budgets[s.id], acts) })) : []), [open, draft, budgets, c, acts]);
  const total = sum(f.map((x) => x.fees));
  const count = sum(f.map((x) => x.count));
  const floor = count >= 3 ? guaranteeFloor(f.flatMap((x) => x.lows)) : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <div className="border-b p-5">
          <DialogTitle className="text-base">Publish {c.name}?</DialogTitle>
          <DialogDescription>Matching runs now. Fixed-fee offers only become commitments when creators accept.</DialogDescription>
        </div>
        <ul className="divide-y">
          {f.map(({ s, count: n, fees, views }) => (
            <li key={s.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              {s.selection === "automatic" ? <Bot className="size-4 text-primary" /> : <Hand className="size-4 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.selection === "automatic" ? `~${n} creators invited now` : `~${n} creators recommended for your approval`} · {compact(views[0])}–{compact(views[2])} views
                </div>
              </div>
              <span className="tabular-nums">{usd(fees)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1.5 border-t bg-muted/30 p-5 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Estimated fees incl. 10% platform fee</dt><dd className="font-medium tabular-nums">{usd(total)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Campaign budget</dt><dd className="tabular-nums">{usd(c.budget)}</dd></div>
          <div className="flex justify-between"><dt className="flex items-center gap-1 text-muted-foreground">Guaranteed floor <DataTag kind="guaranteed" /></dt><dd className="font-medium tabular-nums">{floor ? `${compact(floor)} views` : "Needs 3+ creators"}</dd></div>
          <p className="pt-2 text-xs text-muted-foreground">Budget is authorized now and charged per creator once their posts are verified. Organic reach follows creators&apos; real audiences and isn&apos;t precisely targeted. Dates {shortDate(c.startDate)} – {shortDate(c.endDate)}.</p>
        </dl>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Keep editing</Button>
          <Button onClick={onPublish} disabled={total > c.budget}><Rocket />Publish</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
