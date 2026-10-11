import { toast } from "sonner";
import { creatorById } from "@/lib/domain/creators";
import type { Activation } from "@/lib/domain/types";

/** Feedback after the brand declines a creator: name the replacement, or say none fit. */
export function declineToast(creatorId: string, replacement: Activation | undefined) {
  const first = creatorById(creatorId)?.name.split(" ")[0] ?? "Creator";
  toast(`${first} declined`, {
    description: replacement
      ? `We matched ${creatorById(replacement.creatorId)?.name}. They pair in 24 hours unless you decline.`
      : "No other creators fit this set right now. Widen its targeting or budget to match more.",
  });
}
