"use client";

import { LoaderCircle, ShoppingBag } from "lucide-react";
import { useCheckout } from "@/components/app/checkout";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/pricing";
import { startProjectPurchase } from "@/server/actions/marketplace";

export function BuyProjectButton({ projectId, priceInr }: { projectId: string; priceInr: number }) {
  const { start, busy } = useCheckout();
  return (
    <Button size="lg" className="h-11 w-full rounded-full text-base" disabled={busy} onClick={() => start(() => startProjectPurchase(projectId))}>
      {busy ? <LoaderCircle className="animate-spin" /> : <ShoppingBag data-icon="inline-start" />} Buy for {formatINR(priceInr)}
    </Button>
  );
}
