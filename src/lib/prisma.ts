import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 ต้องต่อฐานข้อมูลผ่าน driver adapter และ schema.prisma ไม่ได้ประกาศ `url`
// (url อยู่ใน prisma.config.ts ซึ่ง CLI ใช้เท่านั้น) จึงอ่าน DATABASE_URL เองตอน runtime
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("ไม่พบ DATABASE_URL — ตรวจสอบไฟล์ .env");
}

// dev mode ของ Next.js hot-reload บ่อย จึงเก็บ instance ไว้บน globalThis
// เพื่อไม่ให้เปิด connection pool ใหม่ทุกครั้งที่ไฟล์ถูกโหลดซ้ำ
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
