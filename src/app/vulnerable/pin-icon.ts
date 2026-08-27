import L from "leaflet";

/**
 * หมุดใช้ divIcon เหมือนฝั่ง EMS เพราะ Leaflet อ้าง path รูปหมุดแบบ hard-code
 * ซึ่งพังเมื่อผ่าน bundler — divIcon เป็น HTML ล้วนจึงคุมสีตามกลุ่มได้ด้วย
 * (ไฟล์นี้ถูก import จาก component ที่ปิด SSR แล้วเท่านั้น จึงเรียก L ตอน import ได้)
 */
const SIZE = 22;

function markerHtml(color: string) {
  return (
    `<div style="width:${SIZE}px;height:${SIZE}px;background:${color};` +
    `border:2px solid #fff;border-radius:50%;` +
    `box-shadow:0 1px 4px rgba(15,23,42,.45);"></div>`
  );
}

export function groupPinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: markerHtml(color),
    iconSize: [SIZE, SIZE],
    iconAnchor: [SIZE / 2, SIZE / 2],
    popupAnchor: [0, -SIZE / 2],
  });
}

/**
 * หมุดที่กำลังลากเพื่อเลือกตำแหน่ง — ทรงหยดน้ำให้ปลายหมุดชี้จุดจริงได้แม่นกว่าวงกลม
 * `iconAnchor` จึงอยู่ที่ปลายล่างสุด ไม่ใช่กึ่งกลางเหมือนหมุดข้อมูล
 */
const DRAG_PIN_SIZE: [number, number] = [32, 44];

export const dragPinIcon = L.divIcon({
  className: "",
  html:
    `<svg viewBox="0 0 32 44" width="32" height="44" style="filter:drop-shadow(0 2px 3px rgba(15,23,42,.45))">` +
    `<path d="M16 43C16 43 30 27.5 30 16A14 14 0 1 0 2 16C2 27.5 16 43 16 43Z" fill="#075985" stroke="#fff" stroke-width="2.5"/>` +
    `<circle cx="16" cy="16" r="5" fill="#fff"/>` +
    `</svg>`,
  iconSize: DRAG_PIN_SIZE,
  iconAnchor: [DRAG_PIN_SIZE[0] / 2, DRAG_PIN_SIZE[1]],
  tooltipAnchor: [0, 4],
});
