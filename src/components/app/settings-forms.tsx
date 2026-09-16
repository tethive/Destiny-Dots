"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LogOut, Monitor, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { PasswordInput } from "@/components/auth/auth-parts";
import { DomainIcon } from "@/components/domain";
import { ThemeSegmented } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { authClient } from "@/lib/auth-client";
import { domains } from "@/lib/catalog";
import { goalLabels, stageLabels, weeklyLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { revokeMySession, updateProfile } from "@/server/actions/student";

type Stage = keyof typeof stageLabels;
type Weekly = keyof typeof weeklyLabels;
type Goal = keyof typeof goalLabels;

export function ProfileForm({
  email,
  initial,
}: {
  email: string;
  initial: { name: string; headline: string; city: string; stage?: Stage; weeklyTime?: Weekly; goalTimeline?: Goal; domainInterests: string[] };
}) {
  const [form, setForm] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateProfile(form);
          if (res.ok) toast.success(res.message);
          else toast.error(res.error);
          router.refresh();
        });
      }}
    >
      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Profile</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" value={form.headline} maxLength={120} onChange={(e) => set("headline", e.target.value)} placeholder="Aspiring SOC analyst" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} maxLength={60} onChange={(e) => set("city", e.target.value)} placeholder="Chennai" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Learning preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">Changing these updates your recommendations.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <LabeledSelect label="Stage" value={form.stage} onChange={(v) => set("stage", v as Stage)} options={stageLabels} />
          <LabeledSelect label="Weekly time" value={form.weeklyTime} onChange={(v) => set("weeklyTime", v as Weekly)} options={weeklyLabels} />
          <LabeledSelect label="Goal" value={form.goalTimeline} onChange={(v) => set("goalTimeline", v as Goal)} options={goalLabels} />
        </div>
        <Label className="mt-5 block">Domains of interest</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {domains.map((d) => {
            const on = form.domainInterests.includes(d.tag);
            return (
              <button
                key={d.tag}
                type="button"
                aria-pressed={on}
                onClick={() => set("domainInterests", on ? form.domainInterests.filter((t) => t !== d.tag) : [...form.domainInterests, d.tag])}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                  on ? "border-primary bg-primary/5 font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <DomainIcon tag={d.tag} className="size-6 rounded-full [&_svg]:size-3.5" /> {d.short}
              </button>
            );
          })}
        </div>
      </section>

      <Button type="submit" size="lg" className="h-10 rounded-full px-6" disabled={pending}>
        {pending && <LoaderCircle className="animate-spin" />} Save changes
      </Button>
    </form>
  );
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: string) => void; options: Record<string, string> }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(options).map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function SecuritySettings({
  hasPassword,
  providers,
  sessions,
}: {
  hasPassword: boolean;
  providers: string[];
  sessions: { id: string; current: boolean; userAgent: string; ipAddress: string; updatedAt: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState({ current: "", next: "" });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <h2 className="font-semibold">Password</h2>
        {hasPassword ? (
          <form
            className="mt-4 grid gap-4 sm:max-w-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (pw.next.length < 8) return void toast.error("Use at least 8 characters.");
              start(async () => {
                const { error } = await authClient.changePassword({ currentPassword: pw.current, newPassword: pw.next, revokeOtherSessions: true });
                if (error) toast.error(error.message ?? "Couldn't change your password.");
                else {
                  toast.success("Password updated. Other devices were signed out.");
                  setPw({ current: "", next: "" });
                  router.refresh();
                }
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="current">Current password</Label>
              <PasswordInput id="current" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <PasswordInput id="new" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </div>
            <Button type="submit" size="lg" className="w-fit rounded-full" disabled={pending || !pw.current || !pw.next}>
              {pending && <LoaderCircle className="animate-spin" />} Update password
            </Button>
          </form>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You sign in with {providers.includes("google") ? "Google" : "a social account"}, so there&apos;s no password to change here.
          </p>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Active sessions</h2>
            <p className="text-sm text-muted-foreground">Devices currently signed in to your account.</p>
          </div>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full"
            disabled={pending || sessions.length < 2}
            onClick={() =>
              start(async () => {
                await authClient.revokeOtherSessions();
                toast.success("Signed out of other devices.");
                router.refresh();
              })
            }
          >
            <LogOut /> Sign out other devices
          </Button>
        </div>
        <ul className="mt-4 divide-y rounded-xl border">
          {sessions.map((s) => {
            const mobile = /mobile|android|iphone/i.test(s.userAgent);
            const Icon = mobile ? Smartphone : Monitor;
            return (
              <li key={s.id} className="flex items-center gap-3 p-3">
                <Icon className="size-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{describeAgent(s.userAgent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.ipAddress && `${s.ipAddress} · `}last active {new Date(s.updatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {s.current ? (
                  <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-medium text-success">This device</span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await revokeMySession(s.id);
                        router.refresh();
                      })
                    }
                  >
                    Revoke
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function describeAgent(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : ua.slice(0, 60);
}

export function AppearanceSettings() {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="font-semibold">Theme</h2>
      <p className="mt-1 text-sm text-muted-foreground">Choose light, dark, or follow your device setting.</p>
      <ThemeSegmented className="mt-4" />
    </section>
  );
}
