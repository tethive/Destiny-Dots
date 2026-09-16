"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, LoaderCircle, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { EnumSelect, Field } from "@/components/admin/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { grantAccess, revokeEntitlement, setUserBan, setUserRole, type AdminResult } from "@/server/actions/admin";

function useAction() {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<AdminResult>) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(res.message ?? "Done");
      else toast.error(res.error);
      router.refresh();
    });
  return { pending, run };
}

export function GrantAccessForm({ userId, paths }: { userId: string; paths: { id: string; title: string }[] }) {
  const { pending, run } = useAction();
  const [scope, setScope] = useState<"PLAN" | "PATH">("PLAN");
  const [pathId, setPathId] = useState<string>();
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");

  return (
    <form
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => grantAccess(userId, { scope, scopeId: pathId, days: days ? Number(days) : undefined, note }));
      }}
    >
      <Field label="What to unlock">
        <EnumSelect value={scope} onChange={(v) => setScope(v as "PLAN" | "PATH")} options={{ PLAN: "Pro — everything", PATH: "A single path" }} />
      </Field>
      {scope === "PATH" && (
        <Field label="Path">
          <EnumSelect value={pathId} onChange={setPathId} options={Object.fromEntries(paths.map((p) => [p.id, p.title]))} placeholder="Choose a path" />
        </Field>
      )}
      <Field label="Duration (days)" hint="Leave blank for no expiry">
        <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Scholarship — Sept cohort" maxLength={200} />
      </Field>
      <Button type="submit" size="lg" className="rounded-full" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Grant access
      </Button>
    </form>
  );
}

export function RevokeButton({ entitlementId }: { entitlementId: string }) {
  const { pending, run } = useAction();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      disabled={pending}
      onClick={() => confirm("Revoke this access now?") && run(() => revokeEntitlement(entitlementId))}
    >
      Revoke
    </Button>
  );
}

export function UserModeration({ userId, role, banned, isSelf }: { userId: string; role: string; banned: boolean; isSelf: boolean }) {
  const { pending, run } = useAction();
  if (isSelf) return <p className="text-sm text-muted-foreground">This is your account.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="lg"
        className="rounded-full"
        disabled={pending}
        onClick={() =>
          confirm(role === "admin" ? "Remove admin rights from this user?" : "Give this user full admin rights?") &&
          run(() => setUserRole(userId, role === "admin" ? "student" : "admin"))
        }
      >
        {role === "admin" ? <ShieldOff /> : <ShieldCheck />} {role === "admin" ? "Remove admin" : "Make admin"}
      </Button>
      <Button
        variant={banned ? "outline" : "destructive"}
        size="lg"
        className="rounded-full"
        disabled={pending}
        onClick={() => {
          if (banned) return run(() => setUserBan(userId, false));
          const reason = prompt("Reason for suspension (shown in the audit log):");
          if (reason !== null) run(() => setUserBan(userId, true, reason));
        }}
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <Ban />} {banned ? "Lift suspension" : "Suspend"}
      </Button>
    </div>
  );
}
