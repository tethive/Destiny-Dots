"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormNotice, PasswordInput, SubmitButton } from "@/components/auth/auth-parts";
import { FormField, fieldAria, fieldInputClass } from "@/components/form-field";
import { resetPassword } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || linkError) {
    return (
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">Link expired</h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          This password reset link is invalid or has expired. Request a new one to continue.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block font-medium text-primary underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const next: typeof errors = {};
    if (password.length < 8) next.password = "Use at least 8 characters.";
    if (confirm !== password) next.confirm = "Passwords don't match.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setPending(true);
    const res = await resetPassword({ token: token!, password });
    if (res.ok && "redirectTo" in res) return window.location.assign(res.redirectTo);
    setPending(false);
    if (!res.ok) setFormError(res.error);
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Choose a new password</h1>
      <p className="mt-2 text-muted-foreground">Use at least 8 characters. You&apos;ll be signed out of other devices.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {formError && <FormNotice tone="error">{formError}</FormNotice>}
        <FormField id="password" label="New password" error={errors.password}>
          <PasswordInput name="password" autoComplete="new-password" className={fieldInputClass} {...fieldAria("password", errors.password)} />
        </FormField>
        <FormField id="confirm" label="Confirm password" error={errors.confirm}>
          <PasswordInput name="confirm" autoComplete="new-password" className={fieldInputClass} {...fieldAria("confirm", errors.confirm)} />
        </FormField>
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </form>
    </div>
  );
}
