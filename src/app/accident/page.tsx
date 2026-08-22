import type { Metadata } from "next";
import {
  getAccidentPoints,
  getCbdOptions,
  getDateRange,
  getDistricts,
  getTotalCount,
} from "./accident-data";
import { auth } from "@/auth";
import AccidentView from "./accident-view";
import { DEFAULT_CBD } from "./cbd";
import { getDistrictBoundsByName, getDistrictExtent } from "./boundary-data";
import { getRescueBases, getRiskPoints } from "./resource-data";

export const metadata: Metadata = {
  title: "EMS - GIS",
  description: "สสจ.พิษณุโลก",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** ค่าจาก query string อาจเป็น array ได้ถ้าใส่คีย์ซ้ำ — เอาตัวแรกพอ */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccidentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // proxy.ts กันไว้แล้วว่าต้องเข้าสู่ระบบก่อน ตรงนี้แค่ดึงข้อมูลมาแสดงบนอวาตาร์
  const session = await auth();
  const filters = {
    dateFrom: first(params.from),
    dateTo: first(params.to),
    district: first(params.district),
    cbd: first(params.cbd) ?? DEFAULT_CBD,
  };

  const [
    points,
    totalCount,
    districts,
    dateBounds,
    rescueBases,
    riskPoints,
    districtExtent,
    districtBounds,
    cbdOptions,
  ] = await Promise.all([
    getAccidentPoints(filters),
    getTotalCount(filters.cbd),
    getDistricts(filters.cbd),
    getDateRange(filters.cbd),
    getRescueBases(),
    getRiskPoints(),
    getDistrictExtent(),
    getDistrictBoundsByName(),
    getCbdOptions(),
  ]);

  return (
    <main className="flex h-dvh min-h-0 flex-1 flex-col overflow-hidden">
      <AccidentView
        points={points}
        rescueBases={rescueBases}
        riskPoints={riskPoints}
        districtExtent={districtExtent}
        districtBounds={districtBounds}
        selectedDistrict={filters.district ?? null}
        districts={districts}
        cbdOptions={cbdOptions}
        user={
          session?.user
            ? {
                name: session.user.name ?? "ผู้ใช้งาน",
                role: session.user.role,
              }
            : null
        }
        dateBounds={dateBounds}
        totalCount={totalCount}
      />
    </main>
  );
}
