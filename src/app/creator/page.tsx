import type { Metadata } from "next";
import { Inbox } from "./_components/inbox";

export const metadata: Metadata = { title: "Offers · Creator Connect" };

export default function CreatorInboxPage() {
  return <Inbox />;
}
