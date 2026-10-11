import type { CampaignStage, Activation, Campaign, CreatorSet, Post } from "@/lib/domain/types";
import type { Rollup } from "@/lib/domain/metrics";

export interface DetailProps {
  campaign: Campaign;
  stage: CampaignStage;
  sets: CreatorSet[];
  activations: Activation[];
  posts: Post[];
  rollup: Rollup;
  goTo: (tab: string, extra?: Record<string, string>) => void;
}
