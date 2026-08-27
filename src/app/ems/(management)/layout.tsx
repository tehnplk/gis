import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/auth";
import LogoutButton from "@/components/logout-button";
import ManagementNav from "./management-nav";

export default async function ManagementLayout({
  children,
}: {
  children: ReactNode;
}) {
  // proxy.ts กันไว้แล้วว่าต้องเข้าสู่ระบบก่อน ตรงนี้แค่ดึงชื่อมาแสดง
  const session = await getSession();
  return (
    <main className="min-h-screen flex-1 bg-slate-100 text-slate-950">
      <header className="border-b border-sky-950 bg-sky-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.14em] text-sky-200 uppercase">
                Accident Data Operations
              </p>
              <h1 className="mt-1 text-xl font-semibold">จัดการข้อมูลอุบัติเหตุ</h1>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Link
                href="/accident"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/40 bg-white px-3 text-sm font-medium text-sky-900 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9"
              >
                <span aria-hidden>←</span>
                กลับหน้าแผนที่
              </Link>

              {session?.user && (
                <LogoutButton username={session.user.name ?? "ผู้ใช้งาน"} />
              )}
            </div>
          </div>

          <ManagementNav role={session?.user?.role} />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</div>
    </main>
  );
}
