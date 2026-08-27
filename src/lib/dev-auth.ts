import type { Session } from "next-auth";

/**
 * ระหว่างพัฒนา (`next dev`) ข้ามการเข้าสู่ระบบ จะได้ไม่ต้องกรอกรหัสใหม่ทุกครั้ง
 * ปิดได้ด้วย DEV_SKIP_AUTH=0 ใน .env ถ้าต้องการทดสอบเส้นทาง login จริง
 *
 * ผูกกับ NODE_ENV ตรง ๆ ไม่ให้มีทางเปิดใช้บน production ได้เลย
 * (`next build`/`next start` และ image ใน docker ตั้ง NODE_ENV=production ให้อยู่แล้ว)
 */
export const DEV_SKIP_AUTH =
  process.env.NODE_ENV !== "production" && process.env.DEV_SKIP_AUTH !== "0";

/** session ปลอมสำหรับโหมด dev — ให้สิทธิ์ super เพื่อเข้าได้ทุกหน้ารวมถึง /manage-user */
export function devSession(): Session {
  return {
    user: {
      name: process.env.SUPER_USER_NAME?.trim() || "admin",
      role: "super",
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
