import type { Metadata } from "next";
import {
  getAccidentPoints,
  getDateRange,
  getDistricts,
  getTotalCount,
} from "./accident-data";
import AccidentView from "./accident-view";
import { getDistrictBoundsByName, getDistrictExtent } from "./boundary-data";
import { getRescueBases, getRiskPoints } from "./resource-data";

export const metadata: Metadata = {
  title: "แผนที่จุดเกิดอุบัติเหตุทางถนน",
  description: "สำนักงานสาธารณสุขจังหวัดพิษณุโลก",
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
  const filters = {
    dateFrom: first(params.from),
    dateTo: first(params.to),
    district: first(params.district),
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
  ] = await Promise.all([
    getAccidentPoints(filters),
    getTotalCount(),
    getDistricts(),
    getDateRange(),
    getRescueBases(),
    getRiskPoints(),
    getDistrictExtent(),
    getDistrictBoundsByName(),
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
        dateBounds={dateBounds}
        totalCount={totalCount}
      />
    </main>
  );
}
