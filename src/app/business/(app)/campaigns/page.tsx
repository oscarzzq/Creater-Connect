import type { Metadata } from "next";
import { AdsManager } from "./_components/ads-manager";

export const metadata: Metadata = { title: "Campaigns · Creator Connect" };

export default function CampaignsPage() {
  return <AdsManager />;
}
