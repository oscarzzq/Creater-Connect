"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAppState, useStoreReady } from "@/lib/store";
import { CampaignEditor } from "../../../_editor/editor";
import { parseNode } from "../../../_editor/editor-state";

export function EditCampaign({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const search = useSearchParams();
  const ready = useStoreReady();
  const world = useAppState();
  if (!ready) return <div className="h-dvh animate-pulse bg-canvas" />;
  const campaign = world.campaigns.find((c) => c.id === id);
  if (!campaign) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas text-sm">
        Campaign not found.
        <Button asChild variant="outline"><Link href="/business/campaigns">Back to campaigns</Link></Button>
      </div>
    );
  }
  return (
    <CampaignEditor
      key={id}
      mode="edit"
      initial={{ campaign, sets: world.sets.filter((s) => s.campaignId === id) }}
      initialNode={parseNode(search.get("node"))}
    />
  );
}
