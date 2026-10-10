import type { Metadata } from "next";
import { CampaignBuilder } from "./_components/campaign-builder";

export const metadata: Metadata = {
  title: "New campaign · Creator Connect",
};

export default function NewCampaignPage() {
  return <CampaignBuilder />;
}
