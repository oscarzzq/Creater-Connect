import type { Metadata } from "next";
import { Onboarding } from "../_components/onboarding";

export const metadata: Metadata = { title: "Set up your profile · Klynt" };

export default function CreatorOnboardingPage() {
  return <Onboarding />;
}
