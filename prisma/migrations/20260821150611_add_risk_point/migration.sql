-- CreateTable
CREATE TABLE "risk_point" (
    "id" SERIAL NOT NULL,
    "place_name" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "coordinate" geometry(Point, 4326),

    CONSTRAINT "risk_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "risk_point_coordinate_idx" ON "risk_point" USING GIST ("coordinate");
