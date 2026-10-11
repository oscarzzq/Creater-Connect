import type { Metadata } from "next";
import { CreatorShell } from "@/components/creator/creator-shell";

export const metadata: Metadata = { title: "Creator · Creator Connect" };

export default function CreatorLayout({ children }: LayoutProps<"/creator">) {
  return <CreatorShell>{children}</CreatorShell>;
}
