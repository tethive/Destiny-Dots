/**
 * Starter interview question bank.
 *
 * These rows are loaded into the database by a migration, so a fresh deploy
 * already has questions. Admins then edit or retire them in Admin → Interview
 * bank; nothing here overwrites their changes afterwards.
 */

export type BankQuestion = {
  /** Stable id so the seed can be applied without creating duplicates. */
  id: string;
  round: "APTITUDE" | "TECHNICAL" | "CODING";
  kind: "MCQ" | "SHORT_ANSWER" | "CODING";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  topic: string;
  prompt: string;
  /** Empty means the question fits every role. */
  domainTags?: string[];
  options?: string[];
  answerIndex?: number;
  explanation?: string;
  modelAnswer?: string;
  language?: string;
  starterCode?: string;
  hints?: string[];
  minutes?: number;
};
