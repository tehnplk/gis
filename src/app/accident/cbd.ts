/**
 * ค่าคงที่ฝั่ง client — ห้าม import อะไรที่แตะ Prisma ในไฟล์นี้
 * ไม่งั้น driver `pg` จะถูกดึงเข้า bundle ของเบราว์เซอร์
 *
 * CBD = อาการนำที่ใช้คัดแยกตอนรับแจ้งเหตุ เก็บในฐานข้อมูลเป็นข้อความเต็ม
 * รูปแบบ "[25] อุบัติเหตุยานยนต์" แต่ใน URL ใช้เฉพาะรหัสตัวเลข
 */

/** ประเภทเหตุที่แผนที่แสดงเมื่อผู้ใช้ยังไม่ได้เลือก — อุบัติเหตุยานยนต์ */
export const DEFAULT_CBD = "25";

/** ค่าที่ใช้ใน query string เมื่อไม่ต้องการกรองประเภทเหตุ */
export const ALL_CBD = "all";

export const CBD_CODE_PATTERN = /^\d+$/;

export type CbdOption = { code: string; label: string; count: number };

/** ตัดเอาเฉพาะรหัสในวงเล็บจาก "[25] อุบัติเหตุยานยนต์" */
export function cbdCode(cbd: string | null) {
  return cbd?.match(/^\[(\d+)\]/)?.[1] ?? null;
}
