"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { SubmitButton } from "@/components/auth/auth-parts";
import { EMAIL_RE, FormField, fieldAria, fieldInputClass } from "@/components/form-field";
import { useTurnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const captcha = useTurnstile("forgot_password");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    if (!EMAIL_RE.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!captcha.ready) {
      setError(captcha.failed ? "The security check couldn't load. Refresh the page and try again." : "Please wait a moment for the security check.");
      return;
    }
    setError(undefined);
    setPending(true);
    const res = await requestPasswordReset({ email, captcha: captcha.token });
    captcha.reset();
    setPending(false);
    if (!res.ok) return setError(res.error);
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div>
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Check your inbox</h1>
        <p className="mt-3 leading-[1.7] text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, you&apos;ll get a link
          to reset your password in a few minutes. Don&apos;t forget to check spam.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button asChild size="lg" className="h-11">
            <Link href="/login">Back to log in</Link>
          </Button>
          <Button variant="ghost" size="lg" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back to log in
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Reset your password</h1>
      <p className="mt-2 text-muted-foreground">Enter the email you signed up with and we&apos;ll send you a reset link.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <FormField id="email" label="Email" error={error}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className={fieldInputClass}
            {...fieldAria("email", error)}
          />
        </FormField>
        {captcha.widget}
        <SubmitButton pending={pending}>Send reset link</SubmitButton>
      </form>
    </div>
  );
}
