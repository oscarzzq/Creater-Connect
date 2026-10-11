import type { Metadata } from "next";
import { Work } from "../_components/work";

export const metadata: Metadata = { title: "Work · Klynt" };

export default function CreatorWorkPage() {
  return <Work />;
}
