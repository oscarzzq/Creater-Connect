import type { Metadata } from "next";
import { Overview } from "./_components/overview";

export const metadata: Metadata = { title: "Overview · Klynt" };

export default function BusinessOverviewPage() {
  return <Overview />;
}
