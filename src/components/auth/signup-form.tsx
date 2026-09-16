"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MailCheck, Sparkles } from "lucide-react";
import { FormNotice, GoogleButton, OrDivider, PasswordInput, SubmitButton } from "@/components/auth/auth-parts";
import { EMAIL_RE, FormField, fieldAria, fieldInputClass } from "@/components/form-field";
import { useTurnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { resendVerification, safeNext, signInWithGoogle, signUp } from "@/lib/auth-client";
import { getDomain } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Errors = Partial<Record<"name" | "email" | "password" | "terms", string>>;

function intentMessage(intent: string | null, interest: string | null) {
  if (interest) {
    const domain = getDomain(interest);
    if (domain) return `Pick ${domain.name} as an interest and we'll tell you when it launches.`;
  }
  if (!intent) return null;
  if (intent === "enrol") return "Create your free account to enrol and start tracking progress.";
  if (intent.startsWith("subscribe")) return "Create your account first — you'll choose Pro right after.";
  if (intent === "path") return "Create your account first — then unlock the full path.";
  const dot = intent.match(/^dot-(\d+)$/);
  if (dot) return `Create your account first — then unlock Dot ${dot[1]}.`;
  return null;
}

function passwordScore(pw: string) {
  return [pw.length >= 8, /\d/.test(pw), /[a-z]/.test(pw) && /[A-Z]/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean)
    .length;
}

const strengthLabel = ["Too short", "Weak", "Okay", "Good", "Strong"];

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const intent = params.get("intent");
  const banner = intentMessage(intent, params.get("interest"));

  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "google" | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const captcha = useTurnstile("signup");

  const score = passwordScore(password);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();

    const nextErrors: Errors = {};
    if (name.length < 2) nextErrors.name = "Please enter your name.";
    if (!EMAIL_RE.test(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (!terms) nextErrors.terms = "Please accept the terms to continue.";
    setErrors(nextErrors);
    setFormError(null);
    if (Object.keys(nextErrors).length) return;

    if (!captcha.ready) {
      setFormError(captcha.failed ? "The security check couldn't load. Refresh the page and try again." : "Please wait a moment for the security check.");
      return;
    }
    setPending("email");
    const res = await signUp({ name, email, password, next, captcha: captcha.token });
    captcha.reset();
    setPending(null);
    if (!res.ok) return setFormError(res.error);
    if ("redirectTo" in res) return window.location.assign(res.redirectTo);
    setSentTo(email);
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

  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  if (sentTo) {
    return (
      <div>
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-6 text-3xl font-semibold tracking-[-0.03em]">Confirm your email</h1>
        <p className="mt-3 leading-[1.7] text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>. Open it to activate your
          account — you&apos;ll be signed in automatically. Don&apos;t forget to check spam.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button
            variant="outline"
            size="lg"
            className="h-11"
            disabled={resent}
            onClick={async () => {
              await resendVerification({ email: sentTo, next });
              setResent(true);
            }}
          >
            {resent ? "Link sent again" : "Resend the link"}
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={loginHref}>Back to log in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-[-0.03em]">Create your free account</h1>
      <p className="mt-2 text-muted-foreground">Start with the first dots of any path — no card needed.</p>

      {banner && (
        <div className="mt-6 flex gap-2.5 rounded-lg bg-accent px-3 py-2.5 text-sm text-accent-foreground">
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          {banner}
        </div>
      )}

      {googleEnabled ? (
        <>
          <div className="mt-8">
            <GoogleButton onClick={onGoogle} pending={pending === "google"} label="Sign up with Google" />
          </div>
          <OrDivider />
        </>
      ) : (
        <div className="mt-8" />
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <FormNotice tone="error">{formError}</FormNotice>}

        <FormField id="name" label="Full name" error={errors.name}>
          <Input name="name" autoComplete="name" placeholder="Aarav Sharma" className={fieldInputClass} {...fieldAria("name", errors.name)} />
        </FormField>

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

        <FormField id="password" label="Password" error={errors.password}>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldInputClass}
            {...fieldAria("password", errors.password, true)}
          />
          {!errors.password && (
            <div id="password-hint" className="flex items-center gap-3" aria-live="polite">
              <div className="flex flex-1 items-center gap-1" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="flex flex-1 items-center">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full transition-colors",
                        i < score ? (score >= 3 ? "bg-success" : "bg-primary") : "bg-border",
                      )}
                    />
                    {i < 3 && <span className={cn("h-0.5 flex-1 transition-colors", i < score - 1 ? (score >= 3 ? "bg-success" : "bg-primary") : "bg-border")} />}
                  </span>
                ))}
              </div>
              <span className="w-16 text-right text-xs text-muted-foreground">
                {password ? strengthLabel[password.length < 8 ? 0 : score] : "8+ chars"}
              </span>
            </div>
          )}
        </FormField>

        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(v) => setTerms(v === true)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "terms-error" : undefined}
              className="mt-0.5 size-[18px]"
            />
            <label htmlFor="terms" className="text-sm leading-snug text-muted-foreground">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">
                Privacy policy
              </Link>
            </label>
          </div>
          {errors.terms && (
            <p id="terms-error" className="text-sm text-destructive" role="alert">
              {errors.terms}
            </p>
          )}
        </div>

        {captcha.widget}
        <SubmitButton pending={pending === "email"}>Create account</SubmitButton>

        <p className="text-center text-xs text-muted-foreground">
          Next: a 60-second quiz to recommend your best-fit paths.
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref} className="font-semibold text-primary underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
