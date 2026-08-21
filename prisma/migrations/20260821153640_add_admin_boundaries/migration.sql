-- CreateTable
CREATE TABLE "district_boundary" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name_th" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120),
    "province_code" VARCHAR(20),
    "province_th" VARCHAR(120),
    "geom" geometry(MultiPolygon, 4326),

    CONSTRAINT "district_boundary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subdistrict_boundary" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name_th" VARCHAR(120) NOT NULL,
    "name_en" VARCHAR(120),
    "district_code" VARCHAR(20),
    "district_th" VARCHAR(120),
    "province_code" VARCHAR(20),
    "province_th" VARCHAR(120),
    "geom" geometry(MultiPolygon, 4326),

    CONSTRAINT "subdistrict_boundary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "district_boundary_code_key" ON "district_boundary"("code");

-- CreateIndex
CREATE INDEX "district_boundary_geom_idx" ON "district_boundary" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "subdistrict_boundary_code_key" ON "subdistrict_boundary"("code");

-- CreateIndex
CREATE INDEX "subdistrict_boundary_geom_idx" ON "subdistrict_boundary" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "subdistrict_boundary_district_code_idx" ON "subdistrict_boundary"("district_code");
