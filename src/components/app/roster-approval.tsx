"use client";

import { CheckCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { creatorById } from "@/lib/domain/creators";
import { compact, usd } from "@/lib/domain/format";
import { guaranteeFloor, matchCreator, withPlatformFee } from "@/lib/domain/matching";
import { sum } from "@/lib/domain/metrics";
import type { Activation, Campaign, CreatorSet } from "@/lib/domain/types";
import { RecommendationCard } from "./recommendation-card";
import { DataTag } from "./status-badge";

/**
 * Review a creator set's recommended roster. Approving doesn't commit anything
 * on a draft; offers go out at launch (or immediately on a live campaign).
 */
export function RosterApproval({
  set,
  campaign,
  items,
  budget,
  onApprove,
  onRemove,
  onUndo,
  onAlternatives,
  onOpenCreator,
}: {
  set: CreatorSet;
  campaign: Pick<Campaign, "brief" | "status">;
  items: Activation[];
  budget: number; // budget available to this set (incl. platform fee)
  onApprove: (ids: string[]) => void;
  onRemove: (id: string) => void;
  onUndo: (id: string) => void;
  onAlternatives: () => void;
  onOpenCreator: (creatorId: string) => void;
}) {
  const pool = items.filter((a) => a.status === "recommended" || a.status === "approved");
  const approved = pool.filter((a) => a.status === "approved");
  const pending = pool.filter((a) => a.status === "recommended");
  const counted = approved.length ? approved : pool;
  const fees = withPlatformFee(sum(counted.map((a) => a.fee)));
  const views = [0, 2].map((i) => sum(counted.map((a) => a.estViews[i])));
  const floor = guaranteeFloor(counted.map((a) => a.estViews[0]));
  const remaining = budget - fees;

  return (
    <div className="space-y-4">
      <div className="surface grid grid-cols-2 gap-px overflow-hidden bg-border @3xl/main:grid-cols-5">
        {(
          [
            [approved.length ? "Approved creators" : "Proposed creators", `${counted.length}`, approved.length ? `${pending.length} still to review` : "None approved yet"],
            ["Creator fees", usd(fees), "incl. 10% platform fee"],
            ["Expected views", `${compact(views[0])}–${compact(views[1])}`, "estimate"],
            ["Guaranteed floor", floor ? compact(floor) : "—", "if launched as approved"],
            ["Budget remaining", usd(remaining), remaining < 0 ? "over this set's budget" : `of ${usd(budget)}`],
          ] as const
        ).map(([label, value, sub]) => (
          <div key={label} className="bg-card p-3.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {label}
              {label === "Expected views" && <DataTag kind="estimate" />}
              {label === "Guaranteed floor" && <DataTag kind="guaranteed" />}
            </div>
            <div className={`mt-1 text-lg font-semibold tracking-tight tabular-nums ${label === "Budget remaining" && remaining < 0 ? "text-destructive-text" : ""}`}>{value}</div>
            <div className="text-[11px] text-muted-foreground">{sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Approving a creator doesn&apos;t mean they&apos;ve accepted. {campaign.status === "draft" ? "Offers go out when you launch." : "Approved creators are invited immediately."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAlternatives}>
            <RefreshCw />
            Request alternatives
          </Button>
          <Button size="sm" disabled={!pending.length} onClick={() => onApprove(pending.map((a) => a.id))}>
            <CheckCheck />
            Approve all ({pending.length})
          </Button>
        </div>
      </div>

      {pool.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No creators to review. Request alternatives to see more matches.</p>
      ) : (
        <div className="grid gap-4 @2xl/main:grid-cols-2 @5xl/main:grid-cols-3">
          {pool.map((a) => {
            const m = matchCreator(creatorById(a.creatorId)!, set, campaign);
            return (
              <RecommendationCard
                key={a.id}
                match={m}
                activation={a}
                onOpen={() => onOpenCreator(a.creatorId)}
                onApprove={() => onApprove([a.id])}
                onRemove={() => onRemove(a.id)}
                onUndo={() => onUndo(a.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
