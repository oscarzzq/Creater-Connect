import type { Metadata } from "next";
import { Inbox } from "./_components/inbox";

export const metadata: Metadata = { title: "Offers · Klynt" };

export default function CreatorInboxPage() {
  return <Inbox />;
}
