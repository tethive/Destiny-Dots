/**
 * Price points from the product spec ("suggested" tiers). One-off prices are
 * deliberately less attractive than the subscription to push subscribers.
 * These become rows in `plans` / `prices` once the database lands.
 */
export const pricing = {
  currency: "INR",
  freeDotsPerPath: 2,
  dotUnlock: 149,
  pathUnlock: 599,
  monthly: 299,
  yearly: 1999,
} as const;

/** Live prices come from the database (admin → Settings); these are only fallbacks. */
export type Prices = { dot: number; path: number; monthly: number; yearly: number };

export const defaultPrices: Prices = { dot: pricing.dotUnlock, path: pricing.pathUnlock, monthly: pricing.monthly, yearly: pricing.yearly };

export const savingPct = (p: Pick<Prices, "monthly" | "yearly">) => Math.max(0, Math.round((1 - p.yearly / (p.monthly * 12)) * 100));

export function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const planFeatures = {
  free: [
    `First ${pricing.freeDotsPerPath} dots of every path`,
    "Full dot map of every roadmap",
    "Progress tracking & bookmarks",
    "Personalised path recommendations",
  ],
  pro: [
    "Every dot in every path",
    "All premium resources & practice sets",
    "Checkpoint quizzes at the end of dots",
    "New paths as soon as they launch",
    "Cancel anytime — keep one-off unlocks",
  ],
  oneOff: [
    "Pay once, keep it forever",
    "Unlock a single dot or a whole path",
    "Great for trying premium content",
  ],
};
