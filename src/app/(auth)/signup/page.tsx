import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Create your free account" };

export default async function SignupPage(props: PageProps<"/signup">) {
  const [session, searchParams] = await Promise.all([getSession(), props.searchParams]);
  if (session) redirect(`/welcome${typeof searchParams.next === "string" ? `?next=${encodeURIComponent(searchParams.next)}` : ""}`);
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return (
    <Suspense>
      <SignupForm googleEnabled={googleEnabled} />
    </Suspense>
  );
}
