import { Suspense } from "react";
import type { Metadata } from "next";
import { CampaignDetail } from "./_components/campaign-detail";

export const metadata: Metadata = { title: "Campaign · Creator Connect" };

export default function CampaignPage({ params }: PageProps<"/business/campaigns/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-card" />}>
      <CampaignDetail params={params} />
    </Suspense>
  );
}
