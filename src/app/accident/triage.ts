/**
 * ค่าคงที่ฝั่ง client — ห้าม import อะไรที่แตะ Prisma ในไฟล์นี้
 * ไม่งั้น driver `pg` จะถูกดึงเข้า bundle ของเบราว์เซอร์
 */

export const TRIAGE_LEVELS = ["black", "red", "orange", "yellow", "green"] as const;

export type TriageLevel = (typeof TRIAGE_LEVELS)[number];

export const TRIAGE_META: Record<TriageLevel, { label: string; color: string }> = {
  black: { label: "ดำ", color: "#111827" },
  red: { label: "แดง", color: "#dc2626" },
  orange: { label: "ส้ม", color: "#ea580c" },
  yellow: { label: "เหลือง", color: "#eab308" },
  green: { label: "เขียว", color: "#16a34a" },
};

/** สีและป้ายกำกับสำหรับจุดที่ยังไม่ได้คัดแยก */
export const UNTRIAGED_COLOR = "#6b7280";
export const UNTRIAGED_LABEL = "ไม่ระบุระดับ";

export function triageColor(triage: TriageLevel | null): string {
  return triage ? TRIAGE_META[triage].color : UNTRIAGED_COLOR;
}

export function triageLabel(triage: TriageLevel | null): string {
  return triage ? TRIAGE_META[triage].label : UNTRIAGED_LABEL;
}
