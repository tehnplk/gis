import L from "leaflet";

/**
 * หมุดใช้ divIcon เหมือนฝั่ง EMS เพราะ Leaflet อ้าง path รูปหมุดแบบ hard-code
 * ซึ่งพังเมื่อผ่าน bundler — divIcon เป็น HTML ล้วนจึงคุมสีตามกลุ่มได้ด้วย
 * (ไฟล์นี้ถูก import จาก component ที่ปิด SSR แล้วเท่านั้น จึงเรียก L ตอน import ได้)
 */
const SIZE = 22;

function markerHtml(color: string, dashed = false) {
  return (
    `<div style="width:${SIZE}px;height:${SIZE}px;background:${color};` +
    `border:${dashed ? "2px dashed #fff" : "2px solid #fff"};border-radius:50%;` +
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

/** หมุดที่เพิ่งปักแต่ยังไม่บันทึก — ขอบประให้ต่างจากหมุดจริงบนแผนที่ */
export const pendingPinIcon = L.divIcon({
  className: "",
  html: markerHtml("#0f172a", true),
  iconSize: [SIZE, SIZE],
  iconAnchor: [SIZE / 2, SIZE / 2],
});
