"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveUsageLimits } from "@/server/actions/admin";

export type UsageLimits = {
  alertPct: number;
  resendDaily: number;
  resendMonthly: number;
  r2StorageGb: number;
  r2WritesMonthly: number;
  r2ReadsMonthly: number;
  neonStorageGb: number;
  adzunaDaily: number;
  joobleDaily: number;
  vercelInvocationsMonthly: number;
};

const fields: { key: keyof UsageLimits; label: string; step?: number }[] = [
  { key: "alertPct", label: "Warn at (% of limit)" },
  { key: "resendDaily", label: "Resend emails / day" },
  { key: "resendMonthly", label: "Resend emails / month" },
  { key: "r2StorageGb", label: "R2 storage (GB)", step: 0.1 },
  { key: "r2WritesMonthly", label: "R2 uploads / month" },
  { key: "r2ReadsMonthly", label: "R2 reads / month" },
  { key: "neonStorageGb", label: "Neon storage (GB)", step: 0.1 },
  { key: "vercelInvocationsMonthly", label: "Vercel function calls / month" },
  { key: "adzunaDaily", label: "Adzuna calls / day" },
  { key: "joobleDaily", label: "Jooble calls / day" },
];

export function UsageLimitsForm({ initial }: { initial: UsageLimits }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveUsageLimits(v);
          if (!res.ok) return void toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 items-end sm:grid-cols-2 lg:grid-cols-5">
        {fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <Input type="number" min={0} step={f.step ?? 1} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: Number(e.target.value) })} />
          </Field>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">The defaults are each service&apos;s free-plan limits. Change them when you upgrade a plan.</p>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Save limits
      </Button>
    </form>
  );
}
