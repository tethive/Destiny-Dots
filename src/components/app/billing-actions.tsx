"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { PaymentsSoonNotice, useCheckout } from "@/components/app/checkout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/pricing";
import { cancelMySubscription, startSubscription } from "@/server/actions/student";

export function SubscribeButtons({ prices }: { prices: { monthly: number; yearly: number } }) {
  const { start, busy, available } = useCheckout();
  if (!available) return <PaymentsSoonNotice />;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button size="lg" className="h-10 rounded-full px-5 shadow-lg shadow-primary/20" disabled={busy} onClick={() => start(() => startSubscription("YEARLY"))}>
        {busy && <LoaderCircle className="animate-spin" />} Yearly — {formatINR(prices.yearly)}
      </Button>
      <Button size="lg" variant="outline" className="h-10 rounded-full px-5" disabled={busy} onClick={() => start(() => startSubscription("MONTHLY"))}>
        Monthly — {formatINR(prices.monthly)}
      </Button>
    </div>
  );
}

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-full">
          Cancel subscription
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Pro?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll keep Pro until the end of the period you&apos;ve paid for. Your progress and any one-off unlocks are kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep Pro</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await cancelMySubscription(subscriptionId);
                if (res.ok) toast.success(res.message);
                else toast.error(res.error);
                router.refresh();
              })
            }
          >
            Cancel at period end
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
