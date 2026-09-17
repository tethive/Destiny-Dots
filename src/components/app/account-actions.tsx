"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, PauseCircle, Trash2 } from "lucide-react";
import { FormNotice } from "@/components/auth/auth-parts";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deactivateMyAccount, deleteMyAccount } from "@/server/actions/account";

export function AccountLifecycle({ isAdmin, needsReauth, email }: { isAdmin: boolean; needsReauth: boolean; email: string }) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 font-semibold">
          <PauseCircle className="size-4 text-muted-foreground" /> Pause your account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Taking a break? We&apos;ll sign you out on every device and hide your marketplace listings. Your progress, purchases and invoices stay safe.
          Log in any time to pick up where you left off.
        </p>
        {isAdmin ? <AdminNotice /> : <PauseDialog />}
      </section>

      <section className="rounded-2xl border border-destructive/30 bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 font-semibold text-destructive">
          <Trash2 className="size-4" /> Delete your account
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This permanently removes your profile, progress, resume, bookmarks, saved jobs and sign-in details for <span className="font-medium text-foreground">{email}</span>.
          Unsold marketplace listings are deleted. Projects someone has bought stay available to those buyers.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          We keep invoices and payment records because Indian tax law requires it. Cancel an active Pro subscription and settle any seller earnings first.
        </p>
        {isAdmin ? <AdminNotice /> : <DeleteDialog needsReauth={needsReauth} />}
      </section>
    </div>
  );
}

function AdminNotice() {
  return <p className="mt-4 text-sm text-muted-foreground">Admin accounts can&apos;t be paused or deleted here. Ask another admin to change your role first.</p>;
}

function PauseDialog() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog onOpenChange={() => setError(null)}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="mt-4 rounded-full">
          Pause account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Pause your account?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll be signed out everywhere and your listings will be hidden. Logging in again reactivates everything.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep it active</AlertDialogCancel>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deactivateMyAccount();
                if (res && !res.ok) setError(res.error);
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Pause account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteDialog({ needsReauth }: { needsReauth: boolean }) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <AlertDialog
      onOpenChange={() => {
        setError(null);
        setConfirm("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="lg" className="mt-4 rounded-full">
          Delete account
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account for good?</AlertDialogTitle>
          <AlertDialogDescription>This can&apos;t be undone. Everything listed on the settings page is removed straight away.</AlertDialogDescription>
        </AlertDialogHeader>
        {needsReauth ? (
          <FormNotice tone="error">For your security, log out and log in again first. You then have 15 minutes to delete your account.</FormNotice>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-mono font-semibold">DELETE</span> to confirm
            </Label>
            <Input id="confirm-delete" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={pending} />
          </div>
        )}
        {error && <FormNotice tone="error">{error}</FormNotice>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={pending || needsReauth || confirm.trim() !== "DELETE"}
            onClick={() =>
              start(async () => {
                const res = await deleteMyAccount({ confirm });
                if (res && !res.ok) setError(res.error);
              })
            }
          >
            {pending && <LoaderCircle className="animate-spin" />} Delete my account
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
