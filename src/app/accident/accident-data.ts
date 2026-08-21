import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { TriageLevel } from "./triage";

export type AccidentPoint = {
  id: number;
  incidentDatetime: string;
  hn: string | null;
  pname: string | null;
  fname: string | null;
  lname: string | null;
  place: string | null;
  district: string | null;
  subdistrict: string | null;
  drunk: boolean | null;
  triage: TriageLevel | null;
  lat: number;
  lng: number;
};

type AccidentRow = {
  id: number;
  incident_datetime: Date;
  hn: string | null;
  pname: string | null;
  fname: string | null;
  lname: string | null;
  place: string | null;
  district: string | null;
  subdistrict: string | null;
  drunk: boolean | null;
  triage: TriageLevel | null;
  lat: number;
  lng: number;
};

export type AccidentFilters = {
  /** วันที่เริ่มต้น รูปแบบ YYYY-MM-DD (รวมทั้งวัน) */
  dateFrom?: string;
  /** วันที่สิ้นสุด รูปแบบ YYYY-MM-DD (รวมทั้งวัน) */
  dateTo?: string;
  district?: string;
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `place_coordinate` เป็น Unsupported("geometry") ที่ Prisma Client อ่านไม่ได้
 * จึงต้อง query ดิบแล้วแตกเป็น lat/lng ด้วย ST_Y/ST_X
 */
export async function getAccidentPoints(
  filters: AccidentFilters = {},
): Promise<AccidentPoint[]> {
  const conditions: Prisma.Sql[] = [Prisma.sql`place_coordinate IS NOT NULL`];

  // เทียบเวลาตามโซนไทย เพราะผู้ใช้เลือกวันที่จากปฏิทินไทย
  // ต้อง cast เป็น ::timestamp ก่อน AT TIME ZONE ไม่งั้น Postgres จะแปลง date
  // ผ่าน timestamptz ตาม timezone ของ session ทำให้ผลลัพธ์เพี้ยนตามเครื่องที่รัน
  if (filters.dateFrom && DATE_PATTERN.test(filters.dateFrom)) {
    conditions.push(
      Prisma.sql`incident_datetime >= (${filters.dateFrom}::date)::timestamp AT TIME ZONE 'Asia/Bangkok'`,
    );
  }

  // บวก 1 วันแล้วใช้ `<` เพื่อให้ครอบคลุมทั้งวันสุดท้าย
  if (filters.dateTo && DATE_PATTERN.test(filters.dateTo)) {
    conditions.push(
      Prisma.sql`incident_datetime < (${filters.dateTo}::date + INTERVAL '1 day')::timestamp AT TIME ZONE 'Asia/Bangkok'`,
    );
  }

  if (filters.district) {
    conditions.push(Prisma.sql`district = ${filters.district}`);
  }

  const rows = await prisma.$queryRaw<AccidentRow[]>`
    SELECT
      id,
      incident_datetime,
      hn,
      pname,
      fname,
      lname,
      place,
      district,
      subdistrict,
      drunk,
      triage,
      ST_Y(place_coordinate::geometry) AS lat,
      ST_X(place_coordinate::geometry) AS lng
    FROM accident
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY incident_datetime DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    incidentDatetime: row.incident_datetime.toISOString(),
    hn: row.hn,
    pname: row.pname,
    fname: row.fname,
    lname: row.lname,
    place: row.place,
    district: row.district,
    subdistrict: row.subdistrict,
    drunk: row.drunk,
    triage: row.triage,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}

/** จำนวนจุดทั้งหมดที่มีพิกัด ใช้เทียบกับผลลัพธ์หลังกรอง */
export async function getTotalCount(): Promise<number> {
  const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM accident WHERE place_coordinate IS NOT NULL
  `;

  return Number(row?.count ?? 0);
}

/** รายชื่ออำเภอที่มีข้อมูลจริง ใช้เติมตัวเลือกใน toolbar */
export async function getDistricts(): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ district: string }[]>`
    SELECT DISTINCT district
    FROM accident
    WHERE district IS NOT NULL
    ORDER BY district
  `;

  return rows.map((row) => row.district);
}

/** ช่วงวันที่ของข้อมูลทั้งหมด ใช้เป็นค่าเริ่มต้นของตัวกรองวันที่ */
export async function getDateRange(): Promise<{
  min: string | null;
  max: string | null;
}> {
  const [row] = await prisma.$queryRaw<
    { min: string | null; max: string | null }[]
  >`
    SELECT
      to_char(MIN(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS min,
      to_char(MAX(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS max
    FROM accident
  `;

  return { min: row?.min ?? null, max: row?.max ?? null };
}
