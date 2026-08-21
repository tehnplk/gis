-- PostGIS: ต้องมี extension ก่อน เพื่อให้ shadow database ของ Prisma รัน migration นี้ได้
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateTable
CREATE TABLE "accident" (
    "id" SERIAL NOT NULL,
    "incident_datetime" TIMESTAMPTZ(6) NOT NULL,
    "hn" VARCHAR(50),
    "place" VARCHAR(255),
    "geom" geometry(Point, 4326),

    CONSTRAINT "accident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accident_geom_idx" ON "accident" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "accident_incident_datetime_idx" ON "accident"("incident_datetime");

-- CreateIndex
CREATE INDEX "accident_hn_idx" ON "accident"("hn");
