-- CreateTable
CREATE TABLE "rescue_base" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "level" VARCHAR(50),
    "vehicle_level" VARCHAR(50),

    CONSTRAINT "rescue_base_pkey" PRIMARY KEY ("id")
);
