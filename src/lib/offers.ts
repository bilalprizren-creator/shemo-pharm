import "server-only";
import rawOffers from "@/data/offers.json";
import { hasOffers } from "@/lib/catalog";

/**
 * The curated offer list the business maintains by hand, as product slugs.
 *
 * One module owns both the list and the "is there anything to show" question,
 * so the offers page, the two navigations, the footer and the sitemap can
 * never disagree about whether /oferta exists.
 */
export const CURATED_OFFER_SLUGS = rawOffers as string[];

/** True when /oferta would render at least one product. */
export function offersAvailable(): Promise<boolean> {
  return hasOffers(CURATED_OFFER_SLUGS);
}
