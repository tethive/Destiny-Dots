"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormNotice, GoogleButton, OrDivider, PasswordInput, SubmitButton } from "@/components/auth/auth-parts";
import { EMAIL_RE, FormField, fieldAria, fieldInputClass } from "@/components/form-field";
import { useTurnstile } from "@/components/security/turnstile";
import { Input } from "@/components/ui/input";
import { safeNext, signInWithEmail, signInWithGoogle } from "@/lib/auth-client";

type Errors = Partial<Record<"email" | "password", string>>;

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const captcha = useTurnstile("login");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const nextErrors: Errors = {};
    if (!EMAIL_RE.test(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) return;

    if (!captcha.ready) {
      setFormError(captcha.failed ? "The security check couldn't load. Refresh the page and try again." : "Please wait a moment for the security check.");
      return;
    }
    setPending("email");
    const res = await signInWithEmail({ email, password, next, captcha: captcha.token });
    captcha.reset();
    if (res.ok && "redirectTo" in res) return window.location.assign(res.redirectTo);
    setPending(null);
    if (!res.ok) setFormError(res.error);
  }

  async function onGoogle() {
    setFormError(null);
    setPending("google");
    const res = await signInWithGoogle({ next });
    if (!res.ok) {
      setPending(null);
      setFormError(res.error);
    }
  }

  const signupHref = next ? `/signup?next=${encodeURIComponent(next)}` : "/signup";

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Log in to pick up where you left off.</p>

      {googleEnabled ? (
        <>
          <div className="mt-8">
            <GoogleButton onClick={onGoogle} pending={pending === "google"} label="Continue with Google" />
          </div>
          <OrDivider />
        </>
      ) : (
        <div className="mt-8" />
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {params.get("reset") && !formError && <FormNotice>Your password was changed. Log in with your new password.</FormNotice>}
        {params.get("error") === "banned" && !formError && (
          <FormNotice tone="error">This account has been suspended. Contact support for help.</FormNotice>
        )}
        {formError && <FormNotice tone="error">{formError}</FormNotice>}

        <FormField id="email" label="Email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            className={fieldInputClass}
            {...fieldAria("email", errors.email)}
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password}
          action={
            <Link href="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput name="password" autoComplete="current-password" className={fieldInputClass} {...fieldAria("password", errors.password)} />
        </FormField>

        {captcha.widget}
        <SubmitButton pending={pending === "email"}>Log in</SubmitButton>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        New to Destiny Dots?{" "}
        <Link href={signupHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          Create a free account
        </Link>
      </p>
    </div>
  );
}
