-- CreateTable
CREATE TABLE "vulnerable_group" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "color" VARCHAR(20) NOT NULL DEFAULT '#0369a1',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vulnerable_group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vulnerable_point" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "note" TEXT,
    "group_id" INTEGER NOT NULL,
    "coordinate" geometry(Point, 4326),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vulnerable_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vulnerable_group_name_key" ON "vulnerable_group"("name");

-- CreateIndex
CREATE INDEX "vulnerable_point_group_id_idx" ON "vulnerable_point"("group_id");

-- CreateIndex
CREATE INDEX "vulnerable_point_coordinate_idx" ON "vulnerable_point" USING GIST ("coordinate");

-- AddForeignKey
ALTER TABLE "vulnerable_point" ADD CONSTRAINT "vulnerable_point_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "vulnerable_group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
