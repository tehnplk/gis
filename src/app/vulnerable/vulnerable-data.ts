import { prisma } from "@/lib/prisma";

export type VulnerableGroup = {
  id: number;
  name: string;
  color: string;
  /** จำนวนหมุดในกลุ่ม ใช้แสดงในแผงกลุ่มและกันการลบกลุ่มที่ยังมีหมุดอยู่โดยไม่รู้ตัว */
  pointCount: number;
};

export type VulnerablePin = {
  id: number;
  name: string;
  note: string | null;
  groupId: number;
  groupName: string;
  color: string;
  lat: number;
  lng: number;
};

type GroupRow = {
  id: number;
  name: string;
  color: string;
  point_count: bigint | number;
};

type PinRow = {
  id: number;
  name: string;
  note: string | null;
  group_id: number;
  group_name: string;
  color: string;
  lat: number | string;
  lng: number | string;
};

export async function getVulnerableGroups(): Promise<VulnerableGroup[]> {
  const rows = await prisma.$queryRaw<GroupRow[]>`
    SELECT
      g.id,
      g.name,
      g.color,
      count(p.id) AS point_count
    FROM vulnerable_group g
    LEFT JOIN vulnerable_point p ON p.group_id = g.id
    GROUP BY g.id
    ORDER BY g.name
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
    pointCount: Number(row.point_count),
  }));
}

/** หมุดที่ยังไม่มีพิกัด (ไม่ควรเกิดจาก UI นี้) วาดบนแผนที่ไม่ได้ จึงกรองออกตั้งแต่ query */
export async function getVulnerablePins(): Promise<VulnerablePin[]> {
  const rows = await prisma.$queryRaw<PinRow[]>`
    SELECT
      p.id,
      p.name,
      p.note,
      p.group_id,
      g.name AS group_name,
      g.color,
      ST_Y(p.coordinate::geometry) AS lat,
      ST_X(p.coordinate::geometry) AS lng
    FROM vulnerable_point p
    JOIN vulnerable_group g ON g.id = p.group_id
    WHERE p.coordinate IS NOT NULL
    ORDER BY p.created_at DESC, p.id DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    note: row.note,
    groupId: row.group_id,
    groupName: row.group_name,
    color: row.color,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}
