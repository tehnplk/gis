"use client";

import dynamic from "next/dynamic";
import type { AccidentPoint } from "./accident-data";
import type { FocusRequest } from "./accident-view";
import type { BoundsTuple } from "./boundary-data";
import type { RescueBasePoint, RiskPointItem } from "./resource-data";

// Leaflet เรียกใช้ `window` ตอน import จึงต้องปิด SSR
// (`ssr: false` ใช้ได้เฉพาะใน Client Component เท่านั้น)
const AccidentMap = dynamic(() => import("./accident-map"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-sm text-foreground/60">
      กำลังโหลดแผนที่...
    </div>
  ),
});

export default function MapLoader({
  points,
  rescueBases,
  riskPoints,
  districtExtent,
  districtBounds,
  selectedDistrict,
  focus,
  resetView,
}: {
  points: AccidentPoint[];
  rescueBases: RescueBasePoint[];
  riskPoints: RiskPointItem[];
  districtExtent: BoundsTuple | null;
  districtBounds: Record<string, BoundsTuple>;
  selectedDistrict: string | null;
  focus: FocusRequest | null;
  resetView: number;
}) {
  return (
    <AccidentMap
      points={points}
      rescueBases={rescueBases}
      riskPoints={riskPoints}
      districtExtent={districtExtent}
      districtBounds={districtBounds}
      selectedDistrict={selectedDistrict}
      focus={focus}
      resetView={resetView}
    />
  );
}
