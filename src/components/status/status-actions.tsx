"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MailCheck } from "lucide-react";
import { EMAIL_RE } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resendVerification } from "@/lib/auth-client";

/** Counts down, then navigates. Shown on success pages that continue automatically. */
export function AutoContinue({ href, seconds = 5, label = "Continue" }: { href: string; seconds?: number; label?: string }) {
  const router = useRouter();
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) {
      router.replace(href);
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left, href, router]);

  return (
    <Button size="lg" className="h-11 rounded-full px-6" onClick={() => router.replace(href)}>
      {label} {left > 0 && <span className="tabular-nums opacity-70">({left})</span>}
    </Button>
  );
}

/** Re-checks the server every few seconds (e.g. while a payment is being confirmed). */
export function AutoRefresh({ everyMs = 3000, maxTries = 40 }: { everyMs?: number; maxTries?: number }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= maxTries) return;
    const id = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, everyMs);
    return () => clearTimeout(id);
  }, [tries, maxTries, everyMs, router]);

  return (
    <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      {tries < maxTries ? (
        <>
          <LoaderCircle className="size-4 animate-spin" /> Checking with the payment provider…
        </>
      ) : (
        "Still waiting — this page will update when you refresh it."
      )}
    </p>
  );
}

/** Asks for the email address and sends a fresh verification link. */
export function ResendVerificationForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (state === "sent") {
    return (
      <p className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
        <MailCheck className="size-4 text-success" /> If that address has an account, a new link is on its way.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!EMAIL_RE.test(email.trim())) {
          setState("error");
          setError("Enter a valid email address.");
          return;
        }
        setState("sending");
        const res = await resendVerification({ email: email.trim(), next });
        if (res.ok) setState("sent");
        else {
          setState("error");
          setError(res.error ?? "Couldn't send the email. Try again shortly.");
        }
      }}
    >
      <Input
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-11"
        aria-label="Email address"
      />
      <Button type="submit" size="lg" className="h-11 shrink-0 rounded-full" disabled={state === "sending"}>
        {state === "sending" && <LoaderCircle className="animate-spin" />} Send new link
      </Button>
      {state === "error" && (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
