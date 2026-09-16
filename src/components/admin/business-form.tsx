"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveBusinessSettings } from "@/server/actions/admin";

type Business = { legalName: string; address: string; state: string; email: string; phone: string; gstin: string; pan: string };

export function BusinessForm({ initial }: { initial: Business }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof Business) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveBusinessSettings(v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Legal / trade name">
          <Input value={v.legalName} onChange={set("legalName")} />
        </Field>
        <Field label="State (place of supply)">
          <Input value={v.state} onChange={set("state")} />
        </Field>
      </div>
      <Field label="Registered address">
        <Input value={v.address} onChange={set("address")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Billing email">
          <Input type="email" value={v.email} onChange={set("email")} />
        </Field>
        <Field label="Phone">
          <Input value={v.phone} onChange={set("phone")} />
        </Field>
        <Field label="GSTIN" hint="Leave empty until registered — invoices are issued as bills of supply">
          <Input value={v.gstin} onChange={set("gstin")} maxLength={15} className="uppercase" />
        </Field>
        <Field label="PAN (optional)">
          <Input value={v.pan} onChange={set("pan")} maxLength={10} className="uppercase" />
        </Field>
      </div>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Save business details
      </Button>
    </form>
  );
}
