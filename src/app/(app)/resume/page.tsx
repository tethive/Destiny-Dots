import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { ResumeBuilder } from "@/components/resume/resume-builder";
import { normaliseResume } from "@/components/resume/types";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getCompletedDotIds, getMyPaths } from "@/server/learning";

export const metadata: Metadata = { title: "Resume builder" };

export default async function ResumePage() {
  const user = await requireUser("/resume");
  const [resume, myPaths, completed] = await Promise.all([
    db.resume.findUnique({ where: { userId: user.id } }),
    getMyPaths(user.id),
    getCompletedDotIds(user.id),
  ]);
  const suggestedCerts = [
    ...new Set(myPaths.flatMap((p) => p.path.dots.filter((d) => d.certification && completed.has(d.id)).map((d) => d.certification!))),
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Resume builder" description="Fill in the form, watch the live preview, and export a clean, recruiter-ready PDF." />
      <ResumeBuilder initial={normaliseResume(resume?.data, user.name, user.email)} suggestedCerts={suggestedCerts} />
    </div>
  );
}
