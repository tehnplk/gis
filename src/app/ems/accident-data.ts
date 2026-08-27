import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CBD_CODE_PATTERN, DEFAULT_CBD, type CbdOption } from "./cbd";
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
  /** รหัสสถานพยาบาลที่นำส่ง (คอลัมน์ "นำส่ง รพ." — ไฟล์ต้นทางให้มาเป็นรหัส ไม่มีชื่อ) */
  hospital: string | null;
  /** ระดับชุดปฏิบัติการที่ออกเหตุ — ALS / ILS / BLS / FR */
  teamLevel: string | null;
  /** ประเภทเหตุแบบเต็ม เช่น "[25] อุบัติเหตุยานยนต์" */
  cbd: string | null;
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
  hospital: string | null;
  team_level: string | null;
  cbd: string | null;
  lat: number;
  lng: number;
};

export type AccidentFilters = {
  /** วันที่เริ่มต้น รูปแบบ YYYY-MM-DD (รวมทั้งวัน) */
  dateFrom?: string;
  /** วันที่สิ้นสุด รูปแบบ YYYY-MM-DD (รวมทั้งวัน) */
  dateTo?: string;
  district?: string;
  /** รหัส CBD ตัวเลข เช่น "25" หรือ ALL_CBD เพื่อดูทุกประเภท */
  cbd?: string;
};

/**
 * ทุก query อ่านจาก view `accident_final_team` ไม่ใช่ตาราง `accident` ตรงๆ
 * เพราะเหตุหนึ่งครั้งมีได้หลายชุดปฏิบัติการ (ชุดแรกไปถึงแล้วส่งต่อชุดระดับสูงกว่า)
 * ถ้านับจากตารางดิบ ผู้ป่วยคนเดียวจะถูกนับซ้ำตามจำนวนชุดที่เข้าไปทำงาน
 * view คัดเหลือเฉพาะชุดสุดท้ายที่รับช่วง — ดูกติกาการเรียงได้ในไฟล์ migration
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ตาราง accident เก็บเหตุแจ้ง 1669 ทุกประเภท (23 CBD) แต่แผนที่แสดงทีละประเภท
 * จึงต้องใส่เงื่อนไขนี้ทุก query ให้ตัวเลขบน toolbar กับหมุดบนแผนที่มาจากชุดเดียวกัน
 * รหัสที่ไม่ใช่ตัวเลขถือว่าไม่กรอง กันไม่ให้ค่าจาก query string หลุดเข้า SQL
 */
function cbdCondition(code: string | undefined): Prisma.Sql {
  const value = code ?? DEFAULT_CBD;
  if (!CBD_CODE_PATTERN.test(value)) return Prisma.sql`TRUE`;
  return Prisma.sql`cbd LIKE ${`[${value}]%`}`;
}

/**
 * `place_coordinate` เป็น Unsupported("geometry") ที่ Prisma Client อ่านไม่ได้
 * จึงต้อง query ดิบแล้วแตกเป็น lat/lng ด้วย ST_Y/ST_X
 */
export async function getAccidentPoints(
  filters: AccidentFilters = {},
): Promise<AccidentPoint[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`place_coordinate IS NOT NULL`,
    cbdCondition(filters.cbd),
  ];

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
      hospital_code AS hospital,
      team_level,
      cbd,
      ST_Y(place_coordinate::geometry) AS lat,
      ST_X(place_coordinate::geometry) AS lng
    FROM accident_final_team
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
    hospital: row.hospital,
    teamLevel: row.team_level,
    cbd: row.cbd,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}

/** จำนวนเคสทั้งหมดที่มีพิกัด ใช้เทียบกับผลลัพธ์หลังกรอง */
export async function getTotalCount(cbd?: string): Promise<number> {
  const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*) AS count FROM accident_final_team
    WHERE place_coordinate IS NOT NULL AND ${cbdCondition(cbd)}
  `;

  return Number(row?.count ?? 0);
}

/** รายชื่ออำเภอที่มีข้อมูลจริง ใช้เติมตัวเลือกใน toolbar */
export async function getDistricts(cbd?: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ district: string }[]>`
    SELECT DISTINCT district
    FROM accident_final_team
    WHERE district IS NOT NULL AND ${cbdCondition(cbd)}
    ORDER BY district
  `;

  return rows.map((row) => row.district);
}

/** ช่วงวันที่ของข้อมูลทั้งหมด ใช้เป็นค่าเริ่มต้นของตัวกรองวันที่ */
export async function getDateRange(cbd?: string): Promise<{
  min: string | null;
  max: string | null;
}> {
  const [row] = await prisma.$queryRaw<
    { min: string | null; max: string | null }[]
  >`
    SELECT
      to_char(MIN(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS min,
      to_char(MAX(incident_datetime) AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD') AS max
    FROM accident_final_team
    WHERE ${cbdCondition(cbd)}
  `;

  return { min: row?.min ?? null, max: row?.max ?? null };
}

/**
 * ประเภทเหตุทั้งหมดที่มีข้อมูลจริง ใช้เติมตัวเลือกใน toolbar
 * ไม่กรองด้วย CBD ที่เลือกอยู่ ไม่งั้น dropdown จะเหลือตัวเลือกเดียว
 * ตัดเอาเฉพาะรหัสในวงเล็บมาเป็น value เพราะข้อความเต็มยาวเกินจะใส่ใน URL
 */
export async function getCbdOptions(): Promise<CbdOption[]> {
  const rows = await prisma.$queryRaw<
    { code: string; label: string; count: bigint }[]
  >`
    SELECT
      split_part(split_part(cbd, ']', 1), '[', 2) AS code,
      cbd AS label,
      count(*) AS count
    FROM accident_final_team
    WHERE cbd IS NOT NULL AND cbd <> '' AND place_coordinate IS NOT NULL
    GROUP BY cbd
    ORDER BY count(*) DESC
  `;

  return rows
    .filter((row) => CBD_CODE_PATTERN.test(row.code))
    .map((row) => ({
      code: row.code,
      label: row.label,
      count: Number(row.count),
    }));
}
