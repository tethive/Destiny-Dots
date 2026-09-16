"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, LoaderCircle, Undo2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatINR } from "@/lib/pricing";
import {
  cancelPayout,
  createPayout,
  markPayoutPaid,
  resolveDispute,
  reviewProject,
  revealPayoutDetails,
  saveMarketplaceSettings,
  unpublishProject,
} from "@/server/actions/admin";

type Result = { ok: boolean; message?: string; error?: string };

function useRun() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.message);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

function ReasonDialog({ trigger, title, description, confirm, destructive, onConfirm }: { trigger: React.ReactNode; title: string; description: string; confirm: string; destructive?: boolean; onConfirm: (text: string) => Promise<Result> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { pending, run } = useRun();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={pending} onClick={() => run(() => onConfirm(text), () => setOpen(false))}>
            {pending && <LoaderCircle className="animate-spin" />} {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReviewActions({ projectId, status }: { projectId: string; status: string }) {
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      {status !== "APPROVED" && (
        <Button disabled={pending} onClick={() => run(() => reviewProject(projectId, true))}>
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />} Approve & publish
        </Button>
      )}
      {status === "PENDING" && (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <X /> Request changes
            </Button>
          }
          title="Request changes"
          description="The seller receives this by email and sees it on their listing."
          confirm="Send to seller"
          onConfirm={(t) => reviewProject(projectId, false, t)}
        />
      )}
      {status === "APPROVED" && (
        <ReasonDialog
          trigger={
            <Button variant="outline">
              <Undo2 /> Unpublish
            </Button>
          }
          title="Unpublish listing"
          description="Removes it from the marketplace. Existing buyers keep access."
          confirm="Unpublish"
          destructive
          onConfirm={(t) => unpublishProject(projectId, t)}
        />
      )}
    </div>
  );
}

export function DisputeActions({ disputeId, amountInr }: { disputeId: string; amountInr: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ReasonDialog
        trigger={<Button size="sm">Refund {formatINR(amountInr)}</Button>}
        title="Refund the buyer"
        description="Refunds through Razorpay, removes the buyer's access and cancels the seller's earning. Explain the decision for both parties."
        confirm="Refund buyer"
        destructive
        onConfirm={(t) => resolveDispute(disputeId, true, t)}
      />
      <ReasonDialog
        trigger={
          <Button size="sm" variant="outline">
            Reject claim
          </Button>
        }
        title="Close without refund"
        description="The sale stays and the seller's earning is released. Explain the decision for both parties."
        confirm="Close dispute"
        onConfirm={(t) => resolveDispute(disputeId, false, t)}
      />
    </div>
  );
}

export function PreparePayoutButton({ sellerId, disabled }: { sellerId: string; disabled?: boolean }) {
  const { pending, run } = useRun();
  return (
    <Button size="sm" disabled={pending || disabled} onClick={() => run(() => createPayout(sellerId))}>
      {pending ? <LoaderCircle className="animate-spin" /> : <Wallet />} Prepare payout
    </Button>
  );
}

export function PayoutDetailsButton({ sellerId }: { sellerId: string }) {
  const [details, setDetails] = useState<{ name: string; details: Record<string, string> } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog open={details !== null} onOpenChange={(o) => !o && setDetails(null)}>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await revealPayoutDetails(sellerId);
            if (!res.ok) return void toast.error(res.error);
            setDetails({ name: res.name, details: res.details });
          })
        }
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Eye />} Payout details
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Payout details</DialogTitle>
          <DialogDescription>This view is recorded in the audit log. Don&apos;t copy these details anywhere else.</DialogDescription>
        </DialogHeader>
        {details && (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Account holder</dt>
              <dd className="font-medium">{details.name}</dd>
            </div>
            {Object.entries(details.details).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{k === "upiId" ? "UPI ID" : k === "ifsc" ? "IFSC" : "Account number"}</dt>
                <dd className="font-mono font-medium select-all">{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PendingPayoutActions({ payoutId, amountInr }: { payoutId: string; amountInr: number }) {
  const [ref, setRef] = useState("");
  const [open, setOpen] = useState(false);
  const { pending, run } = useRun();
  return (
    <div className="flex flex-wrap gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">
            <Check /> Mark paid
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm payout of {formatINR(amountInr)}</DialogTitle>
            <DialogDescription>After sending the money from your bank or UPI app, enter its reference so the seller can match it.</DialogDescription>
          </DialogHeader>
          <Field label="UTR / UPI reference">
            <Input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={60} />
          </Field>
          <DialogFooter>
            <Button disabled={pending} onClick={() => run(() => markPayoutPaid(payoutId, ref), () => setOpen(false))}>
              {pending && <LoaderCircle className="animate-spin" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => confirm("Cancel this payout? The sales become payable again.") && run(() => cancelPayout(payoutId))}>
        Cancel
      </Button>
    </div>
  );
}

export function MarketplaceSettingsForm({ initial }: { initial: { enabled: boolean; commissionPct: number; holdDays: number; minPayoutInr: number; minPriceInr: number; maxPriceInr: number } }) {
  const [v, setV] = useState(initial);
  const { pending, run } = useRun();
  const num = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: Number(e.target.value) });
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveMarketplaceSettings(v));
      }}
    >
      <label className="flex items-center justify-between rounded-xl border p-3 text-sm">
        <span>
          <span className="font-medium">Marketplace open</span>
          <span className="block text-muted-foreground">When closed, buyers keep access to purchases.</span>
        </span>
        <Switch checked={v.enabled} onCheckedChange={(enabled) => setV({ ...v, enabled })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Commission %">
          <Input type="number" min={0} max={50} value={v.commissionPct} onChange={num("commissionPct")} />
        </Field>
        <Field label="Buyer protection (days)">
          <Input type="number" min={0} max={60} value={v.holdDays} onChange={num("holdDays")} />
        </Field>
        <Field label="Minimum payout (₹)">
          <Input type="number" min={0} value={v.minPayoutInr} onChange={num("minPayoutInr")} />
        </Field>
        <Field label="Price range (₹)">
          <div className="flex items-center gap-1.5">
            <Input type="number" min={1} value={v.minPriceInr} onChange={num("minPriceInr")} />
            <span>–</span>
            <Input type="number" min={1} value={v.maxPriceInr} onChange={num("maxPriceInr")} />
          </div>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">Commission changes apply to new sales only.</p>
      <Button type="submit" disabled={pending} className="rounded-full">
        {pending && <LoaderCircle className="animate-spin" />} Save
      </Button>
    </form>
  );
}
