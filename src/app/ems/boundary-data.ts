import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type BoundaryLevel = "district" | "subdistrict";

/**
 * ลดจำนวนจุดของเส้นขอบก่อนส่งให้เบราว์เซอร์
 * 0.0005 องศา ≈ 55 เมตร ซึ่งละเอียดเกินกว่าจะเห็นความต่างที่ระดับซูมทั้งจังหวัด
 * แต่ลดขนาด payload ของชั้นตำบลจาก ~5 MB เหลือ ~350 kB
 */
const SIMPLIFY_TOLERANCE = 0.0005;

const TABLES: Record<BoundaryLevel, Prisma.Sql> = {
  district: Prisma.sql`district_boundary`,
  subdistrict: Prisma.sql`subdistrict_boundary`,
};

/** GeoJSON FeatureCollection ของขอบเขตการปกครอง ประกอบใน SQL เพื่อไม่ต้องแปลงซ้ำใน JS */
export async function getBoundaryGeoJson(level: BoundaryLevel) {
  const [row] = await prisma.$queryRaw<{ fc: unknown }[]>`
    SELECT json_build_object(
      'type', 'FeatureCollection',
      'features', coalesce(
        json_agg(
          json_build_object(
            'type', 'Feature',
            'properties', json_build_object(
              'code', code,
              'name', name_th,
              -- ST_PointOnSurface การันตีว่าอยู่ในรูปหลายเหลี่ยมเสมอ
              -- ต่างจาก centroid ที่อาจตกนอกรูปเว้าหรือรูปที่แยกเป็นหลายส่วน
              'labelLat', ST_Y(ST_PointOnSurface(geom)),
              'labelLng', ST_X(ST_PointOnSurface(geom))
            ),
            'geometry', ST_AsGeoJSON(
              ST_SimplifyPreserveTopology(geom, ${SIMPLIFY_TOLERANCE})
            )::json
          )
        ),
        '[]'::json
      )
    ) AS fc
    FROM ${TABLES[level]}
    WHERE geom IS NOT NULL
  `;

  return row?.fc ?? { type: "FeatureCollection", features: [] };
}

/** ขอบเขตแบบ [[ใต้, ตะวันตก], [เหนือ, ตะวันออก]] ตามรูปแบบที่ Leaflet ใช้ */
export type BoundsTuple = [[number, number], [number, number]];

/**
 * กรอบสี่เหลี่ยมที่ครอบทุกอำเภอ ใช้ตั้งมุมมองเริ่มต้นของแผนที่
 * ดึงแค่ตัวเลข 4 ตัว ไม่ต้องโหลด geometry ทั้งก้อน
 */
export async function getDistrictExtent(): Promise<BoundsTuple | null> {
  const [row] = await prisma.$queryRaw<
    { min_lat: number; min_lng: number; max_lat: number; max_lng: number }[]
  >`
    SELECT
      ST_YMin(e) AS min_lat,
      ST_XMin(e) AS min_lng,
      ST_YMax(e) AS max_lat,
      ST_XMax(e) AS max_lng
    FROM (
      SELECT ST_Extent(geom) AS e
      FROM district_boundary
      WHERE geom IS NOT NULL
    ) t
  `;

  if (!row || row.min_lat == null) return null;

  return [
    [Number(row.min_lat), Number(row.min_lng)],
    [Number(row.max_lat), Number(row.max_lng)],
  ];
}

/**
 * กรอบสี่เหลี่ยมรายอำเภอ ใช้ย้ายมุมมองเมื่อผู้ใช้เลือกอำเภอจาก toolbar
 * คีย์เป็น name_th ให้ตรงกับค่าในคอลัมน์ accident.district
 */
export async function getDistrictBoundsByName(): Promise<
  Record<string, BoundsTuple>
> {
  const rows = await prisma.$queryRaw<
    {
      name_th: string;
      min_lat: number;
      min_lng: number;
      max_lat: number;
      max_lng: number;
    }[]
  >`
    SELECT
      name_th,
      ST_YMin(geom) AS min_lat,
      ST_XMin(geom) AS min_lng,
      ST_YMax(geom) AS max_lat,
      ST_XMax(geom) AS max_lng
    FROM district_boundary
    WHERE geom IS NOT NULL
  `;

  return Object.fromEntries(
    rows.map((row) => [
      row.name_th,
      [
        [Number(row.min_lat), Number(row.min_lng)],
        [Number(row.max_lat), Number(row.max_lng)],
      ] as BoundsTuple,
    ]),
  );
}
