-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('TEXT', 'VOICE');

-- AlterTable
ALTER TABLE "InterviewSession" ADD COLUMN     "mode" "InterviewMode" NOT NULL DEFAULT 'TEXT';

