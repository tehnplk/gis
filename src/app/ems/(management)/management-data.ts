import { prisma } from "@/lib/prisma";

export type RiskManagementRow = {
  id: number;
  placeName: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

export type RescueManagementRow = {
  id: number;
  name: string;
  level: string | null;
  vehicleLevel: string | null;
  lat: number | null;
  lng: number | null;
};

type RiskRow = {
  id: number;
  place_name: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
};

type RescueRow = {
  id: number;
  name: string;
  level: string | null;
  vehicle_level: string | null;
  lat: number | null;
  lng: number | null;
};

export async function getRiskManagementRows(): Promise<RiskManagementRow[]> {
  const rows = await prisma.$queryRaw<RiskRow[]>`
    SELECT
      id,
      place_name,
      note,
      CASE WHEN coordinate IS NULL THEN NULL ELSE ST_Y(coordinate::geometry) END AS lat,
      CASE WHEN coordinate IS NULL THEN NULL ELSE ST_X(coordinate::geometry) END AS lng
    FROM risk_point
    ORDER BY place_name, id
  `;

  return rows.map((row) => ({
    id: row.id,
    placeName: row.place_name,
    note: row.note,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
  }));
}

export async function getRescueManagementRows(): Promise<RescueManagementRow[]> {
  const rows = await prisma.$queryRaw<RescueRow[]>`
    SELECT
      id,
      name,
      level,
      vehicle_level,
      CASE WHEN coordinate IS NULL THEN NULL ELSE ST_Y(coordinate::geometry) END AS lat,
      CASE WHEN coordinate IS NULL THEN NULL ELSE ST_X(coordinate::geometry) END AS lng
    FROM rescue_base
    ORDER BY name, id
  `;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    level: row.level,
    vehicleLevel: row.vehicle_level,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
  }));
}
