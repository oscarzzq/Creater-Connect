import type { Metadata } from "next";
import { OverlayProvider } from "@/components/app/overlays";
import { CampaignEditor } from "../../_editor/editor";

export const metadata: Metadata = { title: "New campaign · Creator Connect" };

export default function NewCampaignPage() {
  return (
    <OverlayProvider>
      <CampaignEditor mode="create" />
    </OverlayProvider>
  );
}
