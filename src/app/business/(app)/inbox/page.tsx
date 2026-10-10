import { Suspense } from "react";
import type { Metadata } from "next";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Inbox · Creator Connect" };

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-card" />}>
      <Inbox />
    </Suspense>
  );
}
