"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlatformIconRow } from "@/components/platform-icon";
import { CreatorSheet } from "@/components/app/creator-sheet";
import { RosterApproval } from "@/components/app/roster-approval";
import { cn } from "@/lib/utils";
import { alternatives, setBudget, type StepProps } from "./builder-state";

export function StepMatching({ draft, setActivations }: StepProps) {
  const [activeId, setActiveId] = useState(draft.sets[0]?.id);
  const [profile, setProfile] = useState<string | null>(null);
  const set = draft.sets.find((s) => s.id === activeId) ?? draft.sets[0];
  if (!set) return null;
  const items = draft.activations.filter((a) => a.setId === set.id);
  const status = (ids: string[], to: "approved" | "recommended" | "removed") => setActivations((acts) => acts.map((a) => (ids.includes(a.id) ? { ...a, status: to } : a)));

  return (
    <div className="space-y-5">
      {draft.sets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {draft.sets.map((s, i) => {
            const approved = draft.activations.filter((a) => a.setId === s.id && a.status === "approved").length;
            return (
              <button key={s.id} onClick={() => setActiveId(s.id)} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium shadow-card", set.id === s.id ? "border-primary ring-1 ring-primary" : "text-muted-foreground hover:text-foreground")}>
                <span className="flex size-5 items-center justify-center rounded bg-muted text-[11px]">{String.fromCharCode(65 + i)}</span>
                {s.name}
                <span className="text-xs text-muted-foreground tabular-nums">{approved} approved</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <PlatformIconRow platforms={set.platforms} />
        {set.name} · fixed fees shown before anything is committed
      </div>
      <RosterApproval
        set={set}
        campaign={draft.campaign}
        items={items}
        budget={setBudget(draft, set)}
        onApprove={(ids) => status(ids, "approved")}
        onRemove={(id) => status([id], "removed")}
        onUndo={(id) => status([id], "recommended")}
        onAlternatives={() => {
          const more = alternatives(draft, set.id);
          setActivations((acts) => [...acts, ...more]);
          toast(more.length ? `Added ${more.length} alternatives` : "No more eligible creators. Broaden this set's targeting.");
        }}
        onOpenCreator={setProfile}
      />
      <CreatorSheet
        key={profile ?? "none"}
        creatorId={profile}
        open={!!profile}
        onOpenChange={(o) => !o && setProfile(null)}
        onOpenActivation={() => undefined}
        setOverride={set}
        campaignOverride={draft.campaign}
      />
    </div>
  );
}
