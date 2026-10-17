-- CreateEnum
CREATE TYPE "InterviewMaterialKind" AS ENUM ('VIDEO', 'DOC', 'PRACTICE', 'LINK');

-- CreateTable
CREATE TABLE "InterviewMaterial" (
    "id" TEXT NOT NULL,
    "round" "InterviewRound" NOT NULL,
    "kind" "InterviewMaterialKind" NOT NULL DEFAULT 'LINK',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT,
    "url" TEXT NOT NULL,
    "domainTags" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "linkStatus" "LinkStatus" NOT NULL DEFAULT 'UNCHECKED',
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InterviewMaterial_round_isActive_idx" ON "InterviewMaterial"("round", "isActive");

