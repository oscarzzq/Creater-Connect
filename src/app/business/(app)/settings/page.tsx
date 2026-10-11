import type { Metadata } from "next";
import { Settings } from "./settings";

export const metadata: Metadata = { title: "Settings · Creator Connect" };

export default function SettingsPage() {
  return <Settings />;
}
