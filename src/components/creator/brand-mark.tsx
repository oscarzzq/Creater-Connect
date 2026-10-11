import { cn } from "@/lib/utils";
import type { Campaign } from "@/lib/domain/types";

const SIZES = {
  xs: "size-4 rounded text-[9px]",
  sm: "size-6 rounded-md text-[11px]",
  md: "size-8 rounded-lg text-sm",
  lg: "size-11 rounded-xl text-lg",
};

/** Brand monogram on the brand's own colour. */
export function BrandMark({
  campaign,
  size = "sm",
  className,
}: {
  campaign: Pick<Campaign, "businessLogo" | "businessColor" | "businessName">;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      title={campaign.businessName}
      className={cn("inline-flex shrink-0 items-center justify-center font-semibold text-white", SIZES[size], campaign.businessColor, className)}
    >
      {campaign.businessLogo}
    </span>
  );
}
