-- AlterTable
ALTER TABLE "Dot" ADD COLUMN     "moduleCode" TEXT,
ADD COLUMN     "topicKey" TEXT;

-- CreateIndex
CREATE INDEX "Dot_topicKey_idx" ON "Dot"("topicKey");

-- CreateIndex
CREATE INDEX "Dot_moduleCode_idx" ON "Dot"("moduleCode");

-- CreateIndex
CREATE UNIQUE INDEX "Dot_pathId_topicKey_key" ON "Dot"("pathId", "topicKey");

