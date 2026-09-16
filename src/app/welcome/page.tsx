import { redirect } from "next/navigation";
import { homeFor, requireUser } from "@/lib/session";

/** Post-sign-in router: admins → /admin, new students → onboarding, others → dashboard or `next`. */
export default async function WelcomePage(props: PageProps<"/welcome">) {
  const { next } = await props.searchParams;
  const user = await requireUser();
  redirect(await homeFor(user, typeof next === "string" ? next : null));
}
