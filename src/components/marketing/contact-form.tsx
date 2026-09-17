"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MailCheck } from "lucide-react";
import { EMAIL_RE, FormField, fieldAria, fieldInputClass } from "@/components/form-field";
import { useTurnstile } from "@/components/security/turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { contactConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { contactTopics } from "@/lib/contact";
import { submitContact } from "@/server/actions/contact";

type Errors = Partial<Record<"name" | "email" | "message" | "form", string>>;

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string } }) {
  const [errors, setErrors] = useState<Errors>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const captcha = useTurnstile("contact");
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const topic = String(data.get("topic") ?? contactTopics[0]) as (typeof contactTopics)[number];
    const message = String(data.get("message") ?? "").trim();
    const website = String(data.get("website") ?? "");

    const next: Errors = {};
    if (name.length < 2) next.name = "Please tell us your name.";
    if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address.";
    if (message.length < 10) next.message = "Add a little more detail (at least 10 characters).";
    if (!Object.keys(next).length && !captcha.ready) {
      next.form = captcha.failed ? "The security check couldn't load. Refresh the page and try again." : "Please wait a moment for the security check.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    start(async () => {
      const res = await submitContact({ name, email, topic, message, website, captcha: captcha.token });
      captcha.reset();
      if (!res.ok) return setErrors(res.field ? { [res.field]: res.error } : { form: res.error });
      form.reset();
      setSentTo(email);
      router.push("/message-sent");
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center py-10 text-center" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-lg font-semibold">Message sent</p>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Thanks for reaching out. We&apos;ve emailed a copy to <span className="font-medium text-foreground">{sentTo}</span> and will reply there. Urgent?
          Call or WhatsApp {contactConfig.phone}.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSentTo(null)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.form && (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {errors.form}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField id="name" label="Name" error={errors.name}>
          <Input name="name" autoComplete="name" maxLength={80} defaultValue={defaults?.name} className={fieldInputClass} {...fieldAria("name", errors.name)} />
        </FormField>
        <FormField id="email" label="Email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={160}
            defaultValue={defaults?.email}
            className={fieldInputClass}
            {...fieldAria("email", errors.email)}
          />
        </FormField>
      </div>

      <FormField id="topic" label="Topic">
        <select
          id="topic"
          name="topic"
          className={cn(
            fieldInputClass,
            "flex w-full rounded-md border border-input px-3 shadow-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none",
          )}
        >
          {contactTopics.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </FormField>

      <FormField id="message" label="Message" error={errors.message}>
        <textarea
          name="message"
          rows={6}
          maxLength={4000}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2.5 text-base shadow-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
          placeholder="How can we help?"
          {...fieldAria("message", errors.message)}
        />
      </FormField>

      {/* Honeypot — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {captcha.widget}

      <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Send message
      </Button>
    </form>
  );
}
