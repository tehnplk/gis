import L from "leaflet";

/**
 * ใช้ divIcon แทน Marker icon ปกติ เพราะ Leaflet อ้าง path ของไฟล์รูปแบบ hard-code
 * ซึ่งพังเมื่อผ่าน bundler — divIcon เป็น HTML ล้วนจึงไม่มีปัญหานี้
 * (ไฟล์นี้ถูก import จาก component ที่ปิด SSR แล้วเท่านั้น จึงเรียก L ตอน import ได้)
 */
export const RESCUE_COLOR = "#2563eb";
export const RISK_COLOR = "#f59e0b";

const ambulanceSvg = `
  <svg
    width="36"
    height="30"
    viewBox="0 0 36 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect x="1" y="1" width="34" height="28" rx="8" fill="${RESCUE_COLOR}" />
    <rect x="1" y="1" width="34" height="28" rx="8" stroke="white" stroke-width="2" />
    <path
      d="M7 12.5C7 11.12 8.12 10 9.5 10H21V22H7V12.5Z"
      fill="white"
    />
    <path
      d="M21 13H26.1C26.94 13 27.72 13.42 28.18 14.12L31 18.33V22H21V13Z"
      fill="white"
    />
    <path d="M23 14.5H25.72L27.72 17.5H23V14.5Z" fill="#bfdbfe" />
    <path d="M13 12H16V19H13V12Z" fill="#dc2626" />
    <path d="M11 14H18V17H11V14Z" fill="#dc2626" />
    <path d="M11 8.5H17" stroke="#dbeafe" stroke-width="2" stroke-linecap="round" />
    <path d="M24 10.5V8.5" stroke="#dbeafe" stroke-width="2" stroke-linecap="round" />
    <circle cx="12" cy="22" r="3" fill="#1e293b" stroke="white" stroke-width="1.5" />
    <circle cx="26" cy="22" r="3" fill="#1e293b" stroke="white" stroke-width="1.5" />
  </svg>`;

const badge = (color: string, symbol: string, extraStyle = "") =>
  `<div style="width:20px;height:20px;background:${color};border:2px solid #fff;` +
  `box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;` +
  `justify-content:center;color:#fff;font-size:12px;font-weight:700;` +
  `line-height:1;${extraStyle}">${symbol}</div>`;

export const rescueIcon = L.divIcon({
  className: "",
  html: ambulanceSvg,
  iconSize: [36, 30],
  iconAnchor: [18, 15],
  popupAnchor: [0, -18],
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
