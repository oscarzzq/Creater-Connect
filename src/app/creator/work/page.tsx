import type { Metadata } from "next";
import { Work } from "../_components/work";

export const metadata: Metadata = { title: "Work · Creator Connect" };

export default function CreatorWorkPage() {
  return <Work />;
}
