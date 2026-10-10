import type { Metadata } from "next";
import { Earnings } from "../_components/earnings";

export const metadata: Metadata = { title: "Earnings · Creator Connect" };

export default function CreatorEarningsPage() {
  return <Earnings />;
}
