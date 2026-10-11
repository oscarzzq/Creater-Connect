import type { Metadata } from "next";
import { AdsManager } from "./_components/ads-manager";

export const metadata: Metadata = { title: "Campaigns · Klynt" };

export default function CampaignsPage() {
  return <AdsManager />;
}
