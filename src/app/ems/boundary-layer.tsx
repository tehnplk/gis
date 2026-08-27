"use client";

import type { FeatureCollection } from "geojson";
import { useEffect, useState } from "react";
import { GeoJSON, Marker, useMapEvents } from "react-leaflet";
import {
  SUBDISTRICT_LABEL_MIN_ZOOM,
  boundaryLabelIcon,
} from "./boundary-label";
import type { BoundaryLevel } from "./boundary-data";

/** เพิ่มเลขนี้ทุกครั้งที่ properties ของ API เปลี่ยนรูปแบบ */
const BOUNDARY_PAYLOAD_VERSION = 2;

/** พิกัดสำหรับวางป้ายชื่อ มาจาก ST_PointOnSurface ฝั่งฐานข้อมูล */
type BoundaryProps = {
  code: string;
  name: string;
  labelLat: number;
  labelLng: number;
};

/**
 * เส้นขอบใช้โทนม่วง ซึ่งไม่ซ้ำกับชั้นข้อมูลอื่น (แดง=จุดเกิดเหตุ, น้ำเงิน=กู้ชีพ,
 * ส้ม=จุดเสี่ยง) และไม่ซ้ำกับสีถนนบนแผนที่ฐาน — สีเทาเข้มแบบเดิมกลืนไปกับถนน
 */
export const BOUNDARY_STYLE: Record<
  BoundaryLevel,
  { color: string; weight: number; casingWeight: number; dashArray?: string }
> = {
  district: { color: "#7c3aed", weight: 2.5, casingWeight: 6 },
  subdistrict: {
    color: "#a855f7",
    weight: 1.2,
    casingWeight: 3.5,
    dashArray: "5 4",
  },
};

/**
 * สีเส้นรองพื้น (casing) — วาดเส้นหนากว่าไว้ข้างล่างเพื่อเว้นช่องว่างรอบเส้นจริง
 * เป็นวิธีมาตรฐานของงานแผนที่ ทำให้เส้นอ่านออกได้ทั้งบนแผนที่ถนน ภาพถ่ายดาวเทียม
 * และแผนที่โหมดมืด โดยไม่ต้องเดาสีพื้นหลัง
 */
const CASING_LIGHT = "#ffffff";
const CASING_DARK = "#0b1120";

export default function BoundaryLayer({
  level,
  visible,
  onDarkBaseMap,
}: {
  level: BoundaryLevel;
  visible: boolean;
  onDarkBaseMap: boolean;
}) {
  const [data, setData] = useState<FeatureCollection | null>(null);

  // ป้ายตำบลโผล่เฉพาะตอนซูมใกล้พอ จึงต้องรู้ระดับซูมปัจจุบัน
  const map = useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    // โหลดครั้งแรกที่เปิดชั้นข้อมูลเท่านั้น แล้วเก็บไว้ใช้ซ้ำ
    if (!visible || data) return;

    let cancelled = false;
    // ?v= ผูกกับรูปแบบข้อมูลที่ตอบกลับ — ต้องบวกเลขเมื่อเปลี่ยน properties
    // ไม่งั้นเบราว์เซอร์ที่เคยเข้ามาก่อนจะใช้ของเก่าในแคชต่ออีกนานตาม max-age
    fetch(`/api/boundaries/${level}?v=${BOUNDARY_PAYLOAD_VERSION}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json) setData(json as FeatureCollection);
      })
      .catch(() => {
        // ปล่อยให้ชั้นข้อมูลว่างไว้ ดีกว่าทำให้แผนที่ทั้งหน้าพัง
      });

    return () => {
      cancelled = true;
    };
  }, [level, visible, data]);

  if (!visible || !data) return null;

  const { color, weight, casingWeight, dashArray } = BOUNDARY_STYLE[level];
  const mode = onDarkBaseMap ? "dark" : "light";
  const showLabels =
    level === "district" || zoom >= SUBDISTRICT_LABEL_MIN_ZOOM;

  return (
    <>
      <GeoJSON
        key={`${level}-casing-${mode}`}
        data={data}
        interactive={false}
        style={{
          color: onDarkBaseMap ? CASING_DARK : CASING_LIGHT,
          weight: casingWeight,
          opacity: 0.75,
          fill: false,
          lineJoin: "round",
        }}
      />
      <GeoJSON
        key={`${level}-line-${mode}`}
        data={data}
        interactive={false}
        style={{ color, weight, dashArray, opacity: 1, fill: false }}
      />

      {/* อำเภอแสดงป้ายเสมอ ส่วนตำบลรอจนซูมใกล้พอ ไม่งั้น 93 ป้ายจะทับกันมั่ว */}
      {showLabels &&
        data.features.map((feature) => {
          const p = feature.properties as BoundaryProps | null;
          if (!p?.name || p.labelLat == null || p.labelLng == null) return null;

          return (
            <Marker
              key={`label-${p.code}`}
              position={[p.labelLat, p.labelLng]}
              icon={boundaryLabelIcon(level, p.name)}
              interactive={false}
              // ต่ำกว่าจุดเกิดเหตุ (650) ป้ายจึงไม่บังจุดข้อมูล
              zIndexOffset={-500}
            />
          );
        })}
    </>
  );
}
