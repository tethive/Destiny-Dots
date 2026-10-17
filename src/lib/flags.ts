/**
 * Features that are built but not launched yet.
 *
 * Safe to import from client components: these are build-time public values,
 * never secrets. Set the variable in Vercel and redeploy to switch one on.
 */

/**
 * Interview prep — mock interviews, the question bank, voice rounds and the
 * resume screen. Hidden until the content and question variety are ready.
 * Enable with NEXT_PUBLIC_INTERVIEW_PREP=1.
 */
export const interviewPrepEnabled = process.env.NEXT_PUBLIC_INTERVIEW_PREP === "1";
