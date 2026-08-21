-- เปลี่ยนชื่อคอลัมน์ (rename แทน drop/add เพื่อรักษาข้อมูลเดิม)
ALTER TABLE "accident" RENAME COLUMN "geom" TO "place_coordinate";

-- เปลี่ยนชื่อ index ให้ตรงกับที่ Prisma คาดหวัง
ALTER INDEX "accident_geom_idx" RENAME TO "accident_place_coordinate_idx";
