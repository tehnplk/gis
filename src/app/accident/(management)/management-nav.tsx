"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/accident/upload", label: "นำเข้าข้อมูล" },
  { href: "/accident/risk", label: "จัดการจุดเสี่ยง" },
  { href: "/accident/rescue", label: "จัดการจุดรถกู้ชีพ" },
  // เฉพาะ super เท่านั้น proxy.ts กันไว้อีกชั้นแล้ว
  { href: "/manage-user", label: "จัดการผู้ใช้", superOnly: true },
] as const;

export default function ManagementNav({ role }: { role?: string }) {
  const pathname = usePathname();
  const items = ITEMS.filter(
    (item) => !("superOnly" in item && item.superOnly) || role === "super",
  );

  return (
    <nav aria-label="เมนูจัดการข้อมูล" className="flex flex-wrap gap-1.5">
      {items.map((item) => {
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 w-full items-center justify-center rounded-md px-3 py-2 text-center text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto ${
              active
                ? "bg-white text-sky-900"
                : "bg-sky-950 text-sky-50 hover:bg-sky-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
