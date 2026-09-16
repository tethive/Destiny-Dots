"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAllSampleContent, updatePricing } from "@/server/actions/admin";

type Prices = { monthly: number; yearly: number; dot: number; path: number };

export function PricingForm({ initial }: { initial: Prices }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof Prices) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updatePricing(v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pro monthly (₹)">
          <Input type="number" min={1} value={v.monthly} onChange={set("monthly")} />
        </Field>
        <Field label="Pro yearly (₹)">
          <Input type="number" min={1} value={v.yearly} onChange={set("yearly")} />
        </Field>
        <Field label="Unlock one dot (₹)">
          <Input type="number" min={1} value={v.dot} onChange={set("dot")} />
        </Field>
        <Field label="Unlock a path (₹)">
          <Input type="number" min={1} value={v.path} onChange={set("path")} />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        Changes apply to new checkouts only. Existing subscribers keep their price. For subscriptions, also create matching plans in Razorpay and update the plan IDs in your environment.
      </p>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Save prices
      </Button>
    </form>
  );
}

export function PurgeSamplesButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="rounded-full hover:text-destructive"
      disabled={pending || count === 0}
      onClick={() =>
        confirm(`Delete ${count} sample updates, jobs and certification guides? Anything you created or edited is kept.`) &&
        start(async () => {
          const res = await deleteAllSampleContent();
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="animate-spin" /> : <Trash2 />} Delete sample content
    </Button>
  );
}
