import type { Metadata } from "next";
import { CreatorShell } from "@/components/creator/creator-shell";

export const metadata: Metadata = { title: "Creator · Klynt" };

export default function CreatorLayout({ children }: LayoutProps<"/creator">) {
  return <CreatorShell>{children}</CreatorShell>;
}
