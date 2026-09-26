"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Level } from "@/generated/prisma/client";
import { getDomain } from "@/lib/catalog";
import { db } from "@/lib/db";
import { isAdmin, requireUser } from "@/lib/session";
import { getAccess } from "@/server/access";
import {
  MAX_SCORE_PER_ANSWER,
  createSession,
  getSession,
  gradeAnswer,
  gradeFollowUp,
  roundConfig,
  ruleSummary,
  summariseSession,
  type RoundKey,
} from "@/server/interviews";

export type InterviewResult = { ok: true; message?: string } | { ok: false; error: string };

/** The simulator is part of Pro; admins always have it for testing. */
async function requirePro() {
  const user = await requireUser("/interview");
  if (isAdmin(user)) return user;
  const access = await getAccess(user.id);
  if (!access.plan) redirect("/billing?from=interview");
  return user;
}

const startSchema = z.object({
  round: z.enum(["APTITUDE", "TECHNICAL", "CODING"]),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  domainTag: z.string().trim().max(40).optional(),
});

export async function startInterview(input: z.input<typeof startSchema>): Promise<InterviewResult> {
  const user = await requirePro();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a round and a level to start." };
  const { round, level, domainTag } = parsed.data;

  if (roundConfig[round as RoundKey].needsDomain && !domainTag) return { ok: false, error: "Choose the role you're interviewing for." };

  // One live session at a time keeps the history clean.
  await db.interviewSession.updateMany({ where: { userId: user.id, status: "IN_PROGRESS" }, data: { status: "ABANDONED", completedAt: new Date() } });

  const session = await createSession(user.id, round as RoundKey, level as Level, domainTag ?? null);
  if (!session) return { ok: false, error: "Not enough questions in this round yet. Try another role or level." };

  revalidatePath("/interview");
  redirect(`/interview/session/${session.id}`);
}

const answerSchema = z.object({
  sessionId: z.string().min(1),
  order: z.number().int().min(1),
  text: z.string().max(20_000).optional(),
  index: z.number().int().min(0).max(9).nullable().optional(),
  secondsSpent: z.number().int().min(0).max(24 * 3600).optional(),
});

export type GradedAnswer = { followUp?: string | null; score?: number; feedback?: string | null; modelAnswer?: string | null };

export async function submitAnswer(input: z.input<typeof answerSchema>): Promise<InterviewResult & GradedAnswer> {
  const user = await requirePro();
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That answer could not be saved." };
  const { sessionId, order, text, index, secondsSpent } = parsed.data;

  const session = await db.interviewSession.findFirst({
    where: { id: sessionId, userId: user.id, status: "IN_PROGRESS" },
    include: { answers: { where: { order }, include: { question: true } } },
  });
  const answer = session?.answers[0];
  if (!session || !answer) return { ok: false, error: "This interview is no longer open." };
  if (answer.answeredAt) return { ok: false, error: "You've already answered this question." };

  const question = answer.question ?? {
    kind: answer.kind,
    prompt: answer.prompt,
    modelAnswer: null,
    explanation: null,
    answerIndex: null,
    topic: "General",
    language: answer.language,
  };
  // Only the technical round gets follow-ups, and only on the first few answers.
  const wantFollowUp = session.round === "TECHNICAL" && order <= 3;
  const grade = await gradeAnswer(question, { text, index: index ?? null }, { wantFollowUp });

  await db.interviewAnswer.update({
    where: { id: answer.id },
    data: {
      answerText: text ?? null,
      answerIndex: index ?? null,
      score: grade.score,
      feedback: grade.feedback,
      isCorrect: answer.kind === "MCQ" ? grade.score > 0 : null,
      followUp: grade.followUp ?? null,
      secondsSpent: secondsSpent ?? null,
      answeredAt: new Date(),
    },
  });

  revalidatePath(`/interview/session/${sessionId}`);
  return {
    ok: true,
    followUp: grade.followUp ?? null,
    score: grade.score,
    feedback: grade.feedback,
    // Revealed only after answering.
    modelAnswer: answer.question?.modelAnswer ?? null,
  };
}

const followUpSchema = z.object({ sessionId: z.string().min(1), order: z.number().int().min(1), text: z.string().trim().min(1).max(5000) });

export async function submitFollowUp(input: z.input<typeof followUpSchema>): Promise<InterviewResult & GradedAnswer> {
  const user = await requirePro();
  const parsed = followUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That reply could not be saved." };
  const { sessionId, order, text } = parsed.data;

  const answer = await db.interviewAnswer.findFirst({
    where: { order, session: { id: sessionId, userId: user.id, status: "IN_PROGRESS" } },
    select: { id: true, prompt: true, followUp: true, score: true, followUpText: true },
  });
  if (!answer?.followUp) return { ok: false, error: "There's no follow-up on this question." };
  if (answer.followUpText) return { ok: false, error: "You've already replied to this follow-up." };

  const grade = await gradeFollowUp(answer.prompt, answer.followUp, text, answer.score);
  await db.interviewAnswer.update({
    where: { id: answer.id },
    data: { followUpText: text, score: grade.score, feedback: grade.feedback },
  });

  revalidatePath(`/interview/session/${sessionId}`);
  return { ok: true, score: grade.score, feedback: grade.feedback };
}

export async function finishInterview(sessionId: string): Promise<InterviewResult> {
  const user = await requirePro();
  const session = await getSession(user.id, sessionId);
  if (!session) return { ok: false, error: "Interview not found." };
  if (session.status !== "IN_PROGRESS") redirect(`/interview/session/${sessionId}/report`);

  const score = session.answers.reduce((n, a) => n + a.score, 0);
  const maxScore = session.answers.length * MAX_SCORE_PER_ANSWER;
  const weakTopics = session.answers
    .filter((a) => a.score < MAX_SCORE_PER_ANSWER * 0.6)
    .map((a) => a.question?.topic)
    .filter((t): t is string => Boolean(t));

  const domainLabel = session.domainTag ? (getDomain(session.domainTag)?.name ?? session.domainTag) : "general";
  const ai = session.answers.some((a) => a.answeredAt)
    ? await summariseSession(
        session.round,
        domainLabel,
        session.answers.map((a) => ({ prompt: a.prompt, score: a.score, feedback: a.feedback })),
      )
    : null;
  const wrap = ai ?? ruleSummary(score, maxScore, weakTopics);

  await db.interviewSession.update({
    where: { id: session.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      score,
      maxScore,
      summary: wrap.summary,
      strengths: wrap.strengths,
      improvements: wrap.improvements,
      aiModel: ai ? "gemini" : null,
    },
  });

  revalidatePath("/interview");
  redirect(`/interview/session/${sessionId}/report`);
}

export async function abandonInterview(sessionId: string): Promise<void> {
  const user = await requirePro();
  await db.interviewSession.updateMany({
    where: { id: sessionId, userId: user.id, status: "IN_PROGRESS" },
    data: { status: "ABANDONED", completedAt: new Date() },
  });
  revalidatePath("/interview");
  redirect("/interview");
}
