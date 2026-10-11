import { Suspense } from "react";
import type { Metadata } from "next";
import { OfferDetail } from "../../_components/offer-detail";

export const metadata: Metadata = { title: "Offer · Creator Connect" };

export default function CreatorOfferPage({ params }: PageProps<"/creator/offers/[id]">) {
  return (
    <Suspense fallback={<div className="surface h-80 animate-pulse" />}>
      <OfferDetail params={params} />
    </Suspense>
  );
}
