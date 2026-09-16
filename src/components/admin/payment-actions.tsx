"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { EnumSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatINR } from "@/lib/pricing";
import { adminRefundOrder, createCoupon, setCouponActive } from "@/server/actions/admin";

export function RefundButton({ orderId, amount }: { orderId: string; amount: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        confirm(`Refund ${formatINR(amount)} and revoke the unlock?`) &&
        start(async () => {
          const res = await adminRefundOrder(orderId);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending && <LoaderCircle className="animate-spin" />} Refund
    </Button>
  );
}

export function CouponToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Switch
      checked={active}
      disabled={pending}
      aria-label="Coupon active"
      onCheckedChange={(v) =>
        start(async () => {
          await setCouponActive(id, v);
          router.refresh();
        })
      }
    />
  );
}

export function CouponForm({ paths }: { paths: { id: string; title: string }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [v, setV] = useState({ code: "", discountPct: "10", maxUses: "", expiresAt: "", scope: "ANY" as "ANY" | "PATH" | "DOT", scopeId: "" });

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await createCoupon({
            code: v.code,
            discountPct: Number(v.discountPct),
            maxUses: v.maxUses ? Number(v.maxUses) : undefined,
            expiresAt: v.expiresAt || undefined,
            scope: v.scope,
            scopeId: v.scopeId || undefined,
          });
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          setV({ ...v, code: "" });
          router.refresh();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Code">
          <Input value={v.code} onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })} placeholder="DIWALI25" className="font-mono" />
        </Field>
        <Field label="Discount %">
          <Input type="number" min={1} max={100} value={v.discountPct} onChange={(e) => setV({ ...v, discountPct: e.target.value })} />
        </Field>
        <Field label="Max uses" hint="Blank = unlimited">
          <Input type="number" min={1} value={v.maxUses} onChange={(e) => setV({ ...v, maxUses: e.target.value })} />
        </Field>
        <Field label="Expires on" hint="Blank = never">
          <Input type="date" value={v.expiresAt} onChange={(e) => setV({ ...v, expiresAt: e.target.value })} />
        </Field>
      </div>
      <Field label="Applies to">
        <EnumSelect value={v.scope} onChange={(s) => setV({ ...v, scope: s as typeof v.scope, scopeId: "" })} options={{ ANY: "Any one-off unlock", PATH: "Path unlocks", DOT: "Dot unlocks" }} />
      </Field>
      {v.scope === "PATH" && (
        <Field label="Specific path" hint="Optional — leave empty for every path">
          <EnumSelect value={v.scopeId} onChange={(s) => setV({ ...v, scopeId: s })} options={Object.fromEntries(paths.map((p) => [p.id, p.title]))} placeholder="Any path" />
        </Field>
      )}
      <Button type="submit" size="lg" className="rounded-full" disabled={pending || !v.code}>
        {pending && <LoaderCircle className="animate-spin" />} Create coupon
      </Button>
    </form>
  );
}
