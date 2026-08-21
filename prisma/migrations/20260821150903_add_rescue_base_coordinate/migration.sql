-- AlterTable
ALTER TABLE "rescue_base" ADD COLUMN     "coordinate" geometry(Point, 4326);

-- CreateIndex
CREATE INDEX "rescue_base_coordinate_idx" ON "rescue_base" USING GIST ("coordinate");
