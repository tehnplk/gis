import L from "leaflet";
import { triageColor } from "./triage";
import type { TriageLevel } from "./triage";

/**
 * พิกัดในข้อมูลต้นทางเป็น centroid ระดับตำบล เหตุหลายพันรายการจึงตกซ้ำกัน
 * อยู่บนพิกัดไม่ถึงร้อยจุด — หมุดเดี่ยวจะซ้อนทับกันจนนับไม่ได้
 * จึงยุบเป็นหมุดเดียวต่อพิกัดแล้วเขียนจำนวนเหตุไว้ในหมุด
 *
 * (ไฟล์นี้ถูก import จาก component ที่ปิด SSR แล้วเท่านั้น จึงเรียก L ตอน import ได้)
 */

const MIN_SIZE = 30;
const MAX_SIZE = 62;

/**
 * ไล่ขนาดตามรากที่สองของจำนวน เพราะสายตาอ่านหมุดเป็น "พื้นที่" ไม่ใช่ "เส้นผ่านศูนย์กลาง"
 * ถ้าไล่ขนาดตรงตามจำนวน จุดที่มี 1,000 เหตุจะดูใหญ่กว่าความจริงหลายเท่า
 */
export function clusterSize(count: number, maxCount: number) {
  if (maxCount <= 1) return MIN_SIZE;
  const ratio = Math.sqrt(count) / Math.sqrt(maxCount);
  return Math.round(MIN_SIZE + (MAX_SIZE - MIN_SIZE) * ratio);
}

/** ตัวเลขหลักเยอะต้องลดขนาดฟอนต์ ไม่งั้นล้นออกนอกวงกลม */
function fontSize(size: number, digits: number) {
  const byWidth = (size * 1.55) / Math.max(digits, 1);
  return Math.max(10, Math.min(Math.round(size * 0.42), Math.round(byWidth)));
}

export function clusterIcon({
  count,
  maxCount,
  triage,
}: {
  count: number;
  maxCount: number;
  triage: TriageLevel | null;
}) {
  const size = clusterSize(count, maxCount);
  const label = count.toLocaleString("th-TH");
  const color = triageColor(triage);

  // เหลืองอ่านตัวอักษรขาวไม่ออก จึงสลับเป็นตัวหนังสือเข้มบนหมุดสีอ่อน
  const textColor = triage === "yellow" || triage === "green" ? "#1f2937" : "#ffffff";

  return L.divIcon({
    className: "",
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:50%;` +
      `background:${color};border:2.5px solid #fff;` +
      `box-shadow:0 1px 4px rgba(0,0,0,.45);display:flex;align-items:center;` +
      `justify-content:center;color:${textColor};font-weight:700;line-height:1;` +
      `font-size:${fontSize(size, label.length)}px;font-variant-numeric:tabular-nums;">` +
      `${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 2],
  });
}
