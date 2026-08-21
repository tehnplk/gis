/**
 * นำเข้าขอบเขตการปกครองจาก desktop GIS (GeoJSON ที่ export จาก QGIS) เข้าตาราง PostGIS
 *
 * ใช้ pg ตรงๆ เพราะเครื่องนี้ไม่มี ogr2ogr / shp2pgsql
 * และ Prisma Client เขียนคอลัมน์ Unsupported("geometry") ไม่ได้
 *
 * วิธีรัน:
 *   node scripts/import-boundaries.mjs [โฟลเดอร์ที่เก็บไฟล์]
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const SOURCE_DIR = process.argv[2] ?? "C:/Users/Admin/Desktop/gis";

const LAYERS = [
  {
    file: "district_boundary.geojson",
    table: "district_boundary",
    columns: ["code", "name_th", "name_en", "province_code", "province_th"],
    map: (p) => [p.ADM2_PCODE, p.ADM2_TH, p.ADM2_EN, p.ADM1_PCODE, p.ADM1_TH],
  },
  {
    file: "subdistrict_boundary.geojson",
    table: "subdistrict_boundary",
    columns: [
      "code",
      "name_th",
      "name_en",
      "district_code",
      "district_th",
      "province_code",
      "province_th",
    ],
    map: (p) => [
      p.ADM3_PCODE,
      p.ADM3_TH,
      p.ADM3_EN,
      p.ADM2_PCODE,
      p.ADM2_TH,
      p.ADM1_PCODE,
      p.ADM1_TH,
    ],
  },
];

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  for (const layer of LAYERS) {
    const raw = await readFile(path.join(SOURCE_DIR, layer.file), "utf8");
    const { features } = JSON.parse(raw);

    await client.query("BEGIN");
    // รันซ้ำได้: ล้างของเดิมแล้วรีเซ็ต id
    await client.query(`TRUNCATE TABLE "${layer.table}" RESTART IDENTITY`);

    // $1..$n เป็น attribute ส่วนตัวสุดท้ายเป็น geometry
    const geomIndex = layer.columns.length + 1;
    const placeholders = layer.columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql =
      `INSERT INTO "${layer.table}" (${layer.columns.map((c) => `"${c}"`).join(", ")}, "geom") ` +
      // ST_Multi กัน Polygon เดี่ยวหลุดเข้ามาแล้วชนกับ type MultiPolygon ของคอลัมน์
      `VALUES (${placeholders}, ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($${geomIndex}), 4326)))`;

    for (const feature of features) {
      await client.query(sql, [
        ...layer.map(feature.properties),
        JSON.stringify(feature.geometry),
      ]);
    }

    await client.query("COMMIT");

    const { rows } = await client.query(
      `SELECT count(*)::int AS n,
              count(*) FILTER (WHERE NOT ST_IsValid(geom))::int AS invalid
       FROM "${layer.table}"`,
    );
    console.log(
      `${layer.table}: นำเข้า ${rows[0].n} แถว (geometry ไม่สมบูรณ์ ${rows[0].invalid})`,
    );
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
