import type { AccidentPoint } from "./accident-data";

/**
 * รวม pname + fname + lname เป็นชื่อเดียว ข้ามส่วนที่ไม่มีข้อมูล
 * (import แบบ type-only เท่านั้น ไฟล์นี้จึงใช้ได้ทั้งฝั่ง server และ client)
 */
export function patientName(point: AccidentPoint): string {
  const name = [point.fname, point.lname].filter(Boolean).join(" ");
  if (!name) return "";
  return `${point.pname ?? ""}${name}`;
}
