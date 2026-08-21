-- AlterTable
ALTER TABLE "accident" ADD COLUMN     "district" VARCHAR(100),
ADD COLUMN     "subdistrict" VARCHAR(100);

-- CreateIndex
CREATE INDEX "accident_district_idx" ON "accident"("district");
