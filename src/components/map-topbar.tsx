"use client";

import Image from "next/image";
import type { ReactNode } from "react";

/**
 * แถบบนของหน้าแผนที่ทุกระบบ (EMS, กลุ่มเปราะบาง) — ตราหน่วยงาน ชื่อระบบ
 * แล้วต่อด้วยตัวควบคุมเฉพาะของแต่ละระบบผ่าน children
 *
 * z สูงเพราะ Leaflet วางแผงควบคุมของตัวเองไว้ที่ z 1000
 * ถ้าไม่ยกขึ้นมา เมนูบัญชีกับ dropdown จะโดนแผนที่ทับ
 */
export function MapTopbar({
  title,
  subtitle = "สสจ.พิษณุโลก",
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <header className="relative z-[1200] flex shrink-0 flex-wrap items-stretch gap-x-3 gap-y-2 border-b border-sky-950 bg-sky-800 px-3 py-2.5 shadow-sm sm:items-center sm:px-4 2xl:flex-nowrap">
      <div className="flex w-full min-w-0 items-center gap-2.5 sm:w-auto">
        <Image
          src="/logo.png"
          alt="ตราสำนักงานปลัดกระทรวงสาธารณสุข"
          width={38}
          height={38}
          priority
          className="size-9 shrink-0 sm:size-[38px]"
        />
        <div className="min-w-0 leading-tight">
          <h1 className="text-sm leading-5 font-semibold text-white sm:text-[15px] sm:whitespace-nowrap">
            {title}
          </h1>
          <p className="truncate text-[11px] text-sky-100 sm:text-xs sm:whitespace-nowrap">
            {subtitle}
          </p>
        </div>
      </div>

      <div aria-hidden className="mx-1 hidden h-9 w-px bg-white/25 lg:block" />

      {children}
    </header>
  );
}

/**
 * ช่องกรอกและปุ่มบน topbar ใช้คลาสชุดเดียวกัน ความสูงจึงเท่ากันหมด
 * และมี focus ring ที่มองเห็นได้ (ค่าเริ่มต้นของเบราว์เซอร์ไม่สม่ำเสมอ)
 */
export const CONTROL_CLASS =
  "h-10 rounded-md border border-sky-900/25 bg-white px-2.5 text-sm text-slate-900 sm:h-9 " +
  "transition-colors outline-none focus-visible:border-white focus-visible:ring-2 " +
  "focus-visible:ring-white/70";

/** ปุ่มรองบน topbar — โปร่งบนพื้นน้ำเงิน ใช้กับ "ล้างตัวกรอง" และปุ่มสั่งงานแผนที่ */
export const GHOST_BUTTON_CLASS =
  "inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-md " +
  "border border-white/40 bg-white/10 px-2.5 text-sm text-white transition-colors " +
  "outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9";

/** กล่องตัวเลขสรุปผลมุมขวาของ topbar */
export function TopbarCount({
  children,
  dim = false,
}: {
  children: ReactNode;
  dim?: boolean;
}) {
  return (
    <div
      aria-live="polite"
      className={`flex h-10 flex-1 items-center justify-center rounded-md bg-white/15 px-2.5 text-sm whitespace-nowrap tabular-nums transition-opacity sm:h-auto sm:flex-none sm:py-1.5 ${
        dim ? "opacity-50" : ""
      }`}
    >
      {children}
    </div>
  );
}
