import L from "leaflet";

/**
 * ใช้ divIcon แทน Marker icon ปกติ เพราะ Leaflet อ้าง path ของไฟล์รูปแบบ hard-code
 * ซึ่งพังเมื่อผ่าน bundler — divIcon เป็น HTML ล้วนจึงไม่มีปัญหานี้
 * (ไฟล์นี้ถูก import จาก component ที่ปิด SSR แล้วเท่านั้น จึงเรียก L ตอน import ได้)
 */
export const RESCUE_COLOR = "#2563eb";
export const RISK_COLOR = "#f59e0b";

const badge = (color: string, symbol: string, extraStyle = "") =>
  `<div style="width:20px;height:20px;background:${color};border:2px solid #fff;` +
  `box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;` +
  `justify-content:center;color:#fff;font-size:12px;font-weight:700;` +
  `line-height:1;${extraStyle}">${symbol}</div>`;

export const rescueIcon = L.divIcon({
  className: "",
  html: badge(RESCUE_COLOR, "✚", "border-radius:5px;"),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

export const riskIcon = L.divIcon({
  className: "",
  // หมุน 45° ให้เป็นสี่เหลี่ยมข้าวหลามตัด แล้วหมุนตัวอักษรกลับให้อ่านออก
  html: badge(
    RISK_COLOR,
    '<span style="transform:rotate(-45deg)">!</span>',
    "border-radius:3px;transform:rotate(45deg);",
  ),
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -14],
});
