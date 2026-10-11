import { Suspense } from "react";
import type { Metadata } from "next";
import { OverlayProvider } from "@/components/app/overlays";
import { EditCampaign } from "./edit-campaign";

export const metadata: Metadata = { title: "Edit campaign · Creator Connect" };

export default function EditCampaignPage({ params }: PageProps<"/business/campaigns/[id]/edit">) {
  return (
    <OverlayProvider>
      <Suspense fallback={<div className="h-dvh animate-pulse bg-canvas" />}>
        <EditCampaign params={params} />
      </Suspense>
    </OverlayProvider>
  );
}
