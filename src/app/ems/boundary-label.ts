import L from "leaflet";
import type { BoundaryLevel } from "./boundary-data";

/** ต่ำกว่านี้ป้ายตำบล 93 อันจะทับกันจนอ่านไม่ออก */
export const SUBDISTRICT_LABEL_MIN_ZOOM = 13;

const STYLE: Record<BoundaryLevel, { fontSize: string; fontWeight: string }> = {
  district: { fontSize: "11px", fontWeight: "600" },
  subdistrict: { fontSize: "10px", fontWeight: "500" },
};

/** เติมคำนำหน้าตามระดับ — ตำบลแสดงเป็น "ต.xxx" */
export function boundaryLabelText(
  level: BoundaryLevel,
  name: string,
): string {
  return level === "subdistrict" ? `ต.${name}` : name;
}

/**
 * ป้ายชื่อพื้นขาว — ใช้ divIcon เพราะเป็น HTML ล้วน
 * ตั้ง iconSize เป็น [0,0] แล้วเลื่อนตัวป้ายเองด้วย translate(-50%,-50%)
 * เพื่อให้กึ่งกลางป้ายตรงกับพิกัดพอดี โดยไม่ต้องรู้ความกว้างของข้อความล่วงหน้า
 */
export function boundaryLabelIcon(
  level: BoundaryLevel,
  name: string,
): L.DivIcon {
  const { fontSize, fontWeight } = STYLE[level];

  return L.divIcon({
    className: "",
    html:
      `<div style="position:absolute;transform:translate(-50%,-50%);` +
      `white-space:nowrap;background:#ffffff;color:#111827;` +
      `border:1px solid rgba(0,0,0,.2);border-radius:4px;` +
      `padding:1px 6px;font-size:${fontSize};font-weight:${fontWeight};` +
      `line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,.25)">` +
      `${escapeHtml(boundaryLabelText(level, name))}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}
