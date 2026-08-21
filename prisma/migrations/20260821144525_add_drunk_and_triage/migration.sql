-- CreateEnum
CREATE TYPE "triage" AS ENUM ('black', 'red', 'orange', 'yellow', 'green');

-- AlterTable
ALTER TABLE "accident" ADD COLUMN     "drunk" BOOLEAN,
ADD COLUMN     "triage" "triage";

-- CreateIndex
CREATE INDEX "accident_triage_idx" ON "accident"("triage");
