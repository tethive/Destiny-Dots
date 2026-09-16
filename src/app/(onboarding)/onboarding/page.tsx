import type { Metadata } from "next";
import { OnboardingQuiz } from "@/components/app/onboarding-quiz";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Personalise your path" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const user = await requireUser("/onboarding");
  const [profile, { next }] = await Promise.all([db.profile.findUnique({ where: { userId: user.id } }), props.searchParams]);

  return (
    <OnboardingQuiz
      firstName={user.name.split(" ")[0]}
      next={typeof next === "string" ? next : undefined}
      initial={{
        stage: profile?.stage ?? undefined,
        domainInterests: profile?.domainInterests ?? [],
        weeklyTime: profile?.weeklyTime ?? undefined,
        goalTimeline: profile?.goalTimeline ?? undefined,
      }}
    />
  );
}
