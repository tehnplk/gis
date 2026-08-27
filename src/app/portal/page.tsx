import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/auth";
import LogoutButton from "@/components/logout-button";

export const metadata: Metadata = {
  title: "เลือกระบบ — GIS สสจ.พิษณุโลก",
  description: "สสจ.พิษณุโลก",
};

/**
 * หน้ารวมทางเข้าของระบบ GIS ทั้งหมด
 * `badge` ใส่เมื่อระบบยังไม่พร้อมใช้จริง ลิงก์ยังกดเข้าไปดูโครงหน้าได้
 */
const SYSTEMS = [
  {
    key: "ems",
    name: "ระบบ GIS - EMS",
    description: "แผนที่อุบัติเหตุและการแพทย์ฉุกเฉิน จุดเกิดเหตุ ชุดปฏิบัติการ และจุดเสี่ยง",
    href: "/ems",
    badge: null,
    icon: (
      <path d="M12 3v6m0 0v6m0-6H6m6 0h6M4.5 20.25h15a1.5 1.5 0 0 0 1.5-1.5V8.25a1.5 1.5 0 0 0-1.5-1.5h-15A1.5 1.5 0 0 0 3 8.25v10.5a1.5 1.5 0 0 0 1.5 1.5Z" />
    ),
  },
  {
    key: "vulnerable",
    name: "ระบบ GIS - กลุ่มเปราะบาง",
    description: "แผนที่ประชากรกลุ่มเปราะบาง ผู้สูงอายุ ผู้พิการ และผู้ป่วยติดเตียงในพื้นที่",
    href: "/vulnerable",
    badge: "อยู่ระหว่างพัฒนา",
    icon: (
      <path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0v.75h-15v-.75Z" />
    ),
  },
] as const;

export default async function PortalPage() {
  const session = await getSession();

  return (
    <main className="flex min-h-dvh flex-1 flex-col bg-slate-100 text-slate-950">
      <header className="border-b border-sky-950 bg-sky-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-sky-200 uppercase">
              Phitsanulok Health GIS
            </p>
            <h1 className="mt-1 text-xl font-semibold">ระบบสารสนเทศภูมิศาสตร์ สสจ.พิษณุโลก</h1>
          </div>

          {session?.user && (
            <LogoutButton username={session.user.name ?? "ผู้ใช้งาน"} />
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <h2 className="text-lg font-semibold text-slate-900">เลือกระบบที่ต้องการใช้งาน</h2>
        <p className="mt-1 text-sm text-slate-500">
          แต่ละระบบใช้บัญชีเดียวกัน ไม่ต้องเข้าสู่ระบบใหม่
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {SYSTEMS.map((system) => {
            const card = (
              <>
                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-7"
                    aria-hidden
                  >
                    {system.icon}
                  </svg>
                </span>

                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-slate-900">
                      {system.name}
                    </span>
                    {system.badge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {system.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {system.description}
                  </span>
                </span>
              </>
            );

            return (
              <li key={system.key}>
                <Link
                  href={system.href}
                  className="flex h-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors outline-none hover:border-sky-700 hover:bg-sky-50 focus-visible:ring-2 focus-visible:ring-sky-700/40"
                >
                  {card}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
