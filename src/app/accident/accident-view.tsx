"use client";

import { Suspense, useCallback, useState } from "react";
import type { AccidentPoint } from "./accident-data";
import AccidentToolbar from "./accident-toolbar";
import type { BoundsTuple } from "./boundary-data";
import MapLoader from "./map-loader";
import type { RescueBasePoint, RiskPointItem } from "./resource-data";

/**
 * ห่อ toolbar กับแผนที่ไว้ด้วยกัน เพื่อให้ช่องค้นหาชื่อสั่งให้แผนที่
 * pan ไปยังจุดที่เลือกได้ (state อยู่ตรงกลางระหว่างสองส่วน)
 */
export type FocusRequest = { point: AccidentPoint };

type Props = {
  points: AccidentPoint[];
  rescueBases: RescueBasePoint[];
  riskPoints: RiskPointItem[];
  districtExtent: BoundsTuple | null;
  districtBounds: Record<string, BoundsTuple>;
  selectedDistrict: string | null;
  districts: string[];
  dateBounds: { min: string | null; max: string | null };
  totalCount: number;
};

export default function AccidentView({
  points,
  rescueBases,
  riskPoints,
  districtExtent,
  districtBounds,
  selectedDistrict,
  districts,
  dateBounds,
  totalCount,
}: Props) {
  const [focus, setFocus] = useState<FocusRequest | null>(null);

  // ห่อเป็น object ใหม่ทุกครั้ง เพื่อให้เลือกจุดเดิมซ้ำแล้วแผนที่ยัง pan ไปอีกรอบ
  const handleSelectPoint = useCallback((point: AccidentPoint) => {
    setFocus({ point });
  }, []);

  return (
    <>
      <Suspense>
        <AccidentToolbar
          points={points}
          onSelectPoint={handleSelectPoint}
          districts={districts}
          dateBounds={dateBounds}
          resultCount={points.length}
          totalCount={totalCount}
        />
      </Suspense>

      <div className="relative min-h-0 flex-1">
        <MapLoader
          points={points}
          rescueBases={rescueBases}
          riskPoints={riskPoints}
          districtExtent={districtExtent}
          districtBounds={districtBounds}
          selectedDistrict={selectedDistrict}
          focus={focus}
        />
      </div>
    </>
  );
}
