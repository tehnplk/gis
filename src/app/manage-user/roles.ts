/**
 * แยกออกจาก actions.ts เพราะไฟล์ "use server" export ได้เฉพาะ async function
 * ถ้าใส่ค่าคงที่ไว้ในนั้น Next.js จะโยน invalid-use-server-value ตั้งแต่ตอนโหลดหน้า
 */

/** role ที่ผู้ดูแลกำหนดให้ผู้ใช้ ProviderID ได้ — "super" สงวนไว้ให้บัญชีใน .env เท่านั้น */
export const ASSIGNABLE_ROLES = ["guest", "user", "admin"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  guest: "guest — ยังไม่ได้รับสิทธิ์",
  user: "user — ดูข้อมูลได้",
  admin: "admin — จัดการข้อมูลได้",
};
