"use client";

import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { actions } from "@/lib/store";
import { creatorById } from "@/lib/domain/creators";
import { compact, usd } from "@/lib/domain/format";
import type { ActivationStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { CreatorPhoto } from "@/components/app/creator-photo";
import { useOverlays } from "@/components/app/overlays";
import { EmptyState } from "@/components/app/section";
import { Users } from "lucide-react";
import { RosterRows } from "./tab-sets";
import type { DetailProps } from "./types";

const FILTERS: [string, string, ActivationStatus[]][] = [
  ["all", "All", ["invited", "accepted", "declined", "expired", "replacement_required", "approved"]],
  ["attention", "Replacements", ["replacement_required"]],
  ["invited", "Invited", ["invited", "approved"]],
  ["accepted", "Accepted", ["accepted"]],
  ["closed", "Declined & expired", ["declined", "expired"]],
];

export function RosterTab({ activations, posts, sets, initial }: DetailProps & { initial?: string }) {
  const { openActivation, openCreator } = useOverlays();
  const [filter, setFilter] = useState(initial ?? "all");
  const statuses = FILTERS.find((f) => f[0] === filter)![2];
  const rows = activations.filter((a) => statuses.includes(a.status));
  const replacements = activations.filter((a) => a.status === "recommended" && a.replacementFor);

  return (
    <div className="space-y-4">
      {replacements.length > 0 && (
        <section className="surface overflow-hidden border-warning/40">
          <div className="border-b bg-warning-subtle/50 px-4 py-3 text-sm">
            <span className="font-medium">Replacements ready.</span> <span className="text-muted-foreground">These creators match the same set at a comparable fee. Approving invites them now.</span>
          </div>
          <ul className="divide-y">
            {replacements.map((a) => {
              const c = creatorById(a.creatorId)!;
              const old = activations.find((x) => x.id === a.replacementFor);
              const set = sets.find((s) => s.id === a.setId);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <button onClick={() => openCreator(c.id, a.setId)}>
                    <CreatorPhoto creator={c} size={36} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {c.name} <span className="font-normal text-muted-foreground">replaces {old ? creatorById(old.creatorId)?.name : "—"}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {set?.name} · fit {a.matchScore} · ~{compact(a.estViews[1])} views · {usd(a.fee)}{old ? ` (was ${usd(old.fee)})` : ""}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { actions.nextReplacement(a.id); toast("Suggested another comparable creator"); }}>
                    <RefreshCw />
                    Another
                  </Button>
                  <Button size="sm" onClick={() => { actions.approve([a.id]); toast.success(`${c.name} invited`); }}>
                    <Check />
                    Approve & invite
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(([key, label, st]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-medium text-muted-foreground shadow-card hover:text-foreground", filter === key && "border-foreground/20 bg-foreground text-background hover:text-background")}
          >
            {label}
            <span className="opacity-60 tabular-nums">{activations.filter((a) => st.includes(a.status)).length}</span>
          </button>
        ))}
      </div>
      {rows.length ? (
        <div className="surface overflow-hidden">
          <RosterRows acts={rows} posts={posts} onOpen={openActivation} />
        </div>
      ) : (
        <EmptyState icon={Users} title="No creators in this state" description="Approved creators appear here once invited." />
      )}
    </div>
  );
}
