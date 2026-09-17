import type { Metadata } from "next";
import { headers } from "next/headers";
import { AccountLifecycle } from "@/components/app/account-actions";
import { PageHeader } from "@/components/app/page-header";
import { AppearanceSettings, ProfileForm, SecuritySettings } from "@/components/app/settings-forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactConfig } from "@/lib/site";
import { isFreshSession, requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage(props: PageProps<"/settings">) {
  const user = await requireUser("/settings");
  const { tab } = await props.searchParams;
  const hdrs = await headers();
  const [profile, accounts, sessions, current] = await Promise.all([
    db.profile.findUnique({ where: { userId: user.id } }),
    db.account.findMany({ where: { userId: user.id }, select: { providerId: true } }),
    db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { updatedAt: "desc" } }),
    auth.api.getSession({ headers: hdrs }),
  ]);
  const hasPassword = accounts.some((a) => a.providerId === "credential");
  // Account deletion needs a recent sign-in (checked again on the server).
  const needsReauth = !isFreshSession(current?.session.createdAt);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile, security and preferences." />
      <Tabs defaultValue={typeof tab === "string" ? tab : "profile"}>
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileForm
            email={user.email}
            initial={{
              name: user.name,
              headline: profile?.headline ?? "",
              city: profile?.city ?? "",
              stage: profile?.stage ?? undefined,
              weeklyTime: profile?.weeklyTime ?? undefined,
              goalTimeline: profile?.goalTimeline ?? undefined,
              domainInterests: profile?.domainInterests ?? [],
            }}
          />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings
            hasPassword={hasPassword}
            providers={accounts.map((a) => a.providerId)}
            sessions={sessions.map((s) => ({
              id: s.id,
              current: s.id === current?.session.id,
              userAgent: s.userAgent ?? "Unknown device",
              ipAddress: s.ipAddress ?? "",
              updatedAt: s.updatedAt.toISOString(),
            }))}
          />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <section className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="font-semibold">Your data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Want a copy of everything we hold about you? Email{" "}
              <a
                className="font-medium text-primary underline-offset-4 hover:underline"
                href={`mailto:${contactConfig.email}?subject=${encodeURIComponent("Data request")}&body=${encodeURIComponent(`Account email: ${user.email}`)}`}
              >
                {contactConfig.email}
              </a>{" "}
              from your registered address and we&apos;ll send it to you.
            </p>
          </section>
          <AccountLifecycle isAdmin={user.role === "admin"} needsReauth={needsReauth} email={user.email} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
