"use client";

import L from "leaflet";
import "leaflet.heat";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { AccidentPoint } from "./accident-data";

/**
 * ไล่สีโทนเดียว อ่อน→เข้ม ตามหลัก sequential (ความชุกคือ "ปริมาณ" ไม่ใช่ "ประเภท")
 * จึงไม่ใช้ไล่สีรุ้งแบบ heatmap ทั่วไป ซึ่งอ่านลำดับความเข้มไม่ได้
 *
 * เก็บเป็น array เรียงลำดับ ไม่ใช่ object เพราะคีย์ `1` เป็นเลขจำนวนเต็ม
 * JavaScript จะเรียงขึ้นหน้าคีย์ทศนิยมเสมอ ทำให้ไล่สีกลับด้าน
 */
export const HEAT_STOPS: [number, string][] = [
  [0.2, "rgba(254, 202, 202, 0.60)"],
  [0.4, "rgba(252, 129, 129, 0.75)"],
  [0.6, "rgba(239, 68, 68, 0.85)"],
  [0.8, "rgba(185, 28, 28, 0.90)"],
  [1.0, "rgba(127, 29, 29, 0.95)"],
];

/** รูปแบบที่ leaflet.heat ต้องการ */
const HEAT_GRADIENT = Object.fromEntries(HEAT_STOPS);

/** ไล่สีเดียวกันในรูป CSS สำหรับ legend ในแผงควบคุม */
export const HEAT_GRADIENT_CSS = `linear-gradient(to right, ${HEAT_STOPS.map(
  ([stop, color]) => `${color} ${stop * 100}%`,
).join(", ")})`;

const HEAT_OPTIONS = {
  radius: 32,
  blur: 22,
  minOpacity: 0.35,
  /**
   * leaflet.heat ลดความเข้มลง 1/2^(maxZoom - zoom) เมื่อซูมออกจาก maxZoom
   * ถ้าตั้งไว้สูง (เช่น 13) ตอนดูทั้งจังหวัดที่ zoom 9 ความเข้มจะเหลือ 1/16 จนแทบมองไม่เห็น
   * จึงตั้งใกล้ระดับซูมที่ใช้ดูภาพรวมจริง
   */
  maxZoom: 10,
  gradient: HEAT_GRADIENT,
};

export default function HeatmapLayer({
  points,
  visible,
}: {
  points: AccidentPoint[];
  visible: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!visible || points.length === 0) return;

    // น้ำหนักเท่ากันทุกจุด = ความชุก (ความหนาแน่นของเหตุการณ์)
    const data = points.map(
      (p) => [p.lat, p.lng, 1] as [number, number, number],
    );
    const layer = L.heatLayer(data, HEAT_OPTIONS).addTo(map);

    // leaflet.heat ยัด canvas ต่อท้าย overlayPane เสมอ (ไม่รองรับ option `pane`)
    // จึงบังวงกลมจุดเกิดเหตุที่อยู่ใน SVG ของ pane เดียวกัน
    // ย้ายมาไว้หน้าสุดของ pane เดิม (parent เดิม onRemove จึงยังทำงานถูก)
    const overlayPane = map.getPanes().overlayPane;
    const canvas = overlayPane.querySelector<HTMLCanvasElement>(
      ".leaflet-heatmap-layer",
    );
    if (canvas) {
      overlayPane.insertBefore(canvas, overlayPane.firstChild);
      canvas.style.pointerEvents = "none";
    }

    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, visible]);

  return null;
}
