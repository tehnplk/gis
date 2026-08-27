import { prisma } from "@/lib/prisma";

export type RescueBasePoint = {
  id: number;
  name: string;
  level: string | null;
  vehicleLevel: string | null;
  lat: number;
  lng: number;
};

export type RiskPointItem = {
  id: number;
  placeName: string;
  note: string | null;
  lat: number;
  lng: number;
};

type RescueBaseRow = {
  id: number;
  name: string;
  level: string | null;
  vehicle_level: string | null;
  lat: number;
  lng: number;
};

type RiskPointRow = {
  id: number;
  place_name: string;
  note: string | null;
  lat: number;
  lng: number;
};

/** `coordinate` เป็น Unsupported("geometry") จึงต้อง query ดิบเหมือนตาราง accident */
export async function getRescueBases(): Promise<RescueBasePoint[]> {
  const rows = await prisma.$queryRaw<RescueBaseRow[]>`
    SELECT
      id,
      name,
      level,
      vehicle_level,
      ST_Y(coordinate::geometry) AS lat,
      ST_X(coordinate::geometry) AS lng
    FROM rescue_base
    WHERE coordinate IS NOT NULL
    ORDER BY name
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    vehicleLevel: row.vehicle_level,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}

export async function getRiskPoints(): Promise<RiskPointItem[]> {
  const rows = await prisma.$queryRaw<RiskPointRow[]>`
    SELECT
      id,
      place_name,
      note,
      ST_Y(coordinate::geometry) AS lat,
      ST_X(coordinate::geometry) AS lng
    FROM risk_point
    WHERE coordinate IS NOT NULL
    ORDER BY place_name
  `;

  return rows.map((row) => ({
    id: row.id,
    placeName: row.place_name,
    note: row.note,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}
