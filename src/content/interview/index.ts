import { aptitudeBank } from "@/content/interview/aptitude";
import { codingBank } from "@/content/interview/coding";
import { technicalBank } from "@/content/interview/technical";
import type { BankQuestion } from "@/content/interview/types";

/** The starter bank shipped with the app; admins edit it from Admin → Interview bank. */
export const interviewBank: BankQuestion[] = [...aptitudeBank, ...technicalBank, ...codingBank];

export type { BankQuestion };
