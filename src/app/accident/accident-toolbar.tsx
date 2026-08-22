"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AccidentPoint } from "./accident-data";
import { ALL_CBD, DEFAULT_CBD, type CbdOption } from "./cbd";
import HnSearch from "./hn-search";

type Props = {
  /** จุดที่แสดงอยู่ตอนนี้ ใช้เป็นตัวเลือกของ autocomplete */
  points: AccidentPoint[];
  onSelectPoint: (point: AccidentPoint) => void;
  districts: string[];
  /** ประเภทเหตุที่มีข้อมูลจริง เรียงจากพบมากไปน้อย */
  cbdOptions: CbdOption[];
  /** ช่วงวันที่ของข้อมูลทั้งหมด ใช้จำกัดขอบเขตของ input */
  dateBounds: { min: string | null; max: string | null };
  resultCount: number;
  totalCount: number;
};

const FILTER_KEYS = ["from", "to", "district", "cbd"] as const;

/**
 * ช่องกรอกทุกช่องใช้คลาสชุดเดียวกัน ความสูงจึงเท่ากันหมดและมี focus ring ที่มองเห็นได้
 * (ค่าเริ่มต้นของเบราว์เซอร์บน input[type=date] ไม่สม่ำเสมอ)
 */
export const CONTROL_CLASS =
  "h-10 rounded-md border border-sky-900/25 bg-white px-2.5 text-sm text-slate-900 sm:h-9 " +
  "transition-colors outline-none focus-visible:border-white focus-visible:ring-2 " +
  "focus-visible:ring-white/70";

/** คำเชื่อมคั่นกลางช่องวันที่สองช่อง ทำหน้าที่เป็นป้ายกำกับในตัว */
const CONNECTOR = "text-sm text-sky-100";

export default function AccidentToolbar({
  points,
  onSelectPoint,
  districts,
  cbdOptions,
  dateBounds,
  resultCount,
  totalCount,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const district = searchParams.get("district") ?? "";
  // ไม่มีพารามิเตอร์ = ดูอุบัติเหตุยานยนต์ ต้องให้ select โชว์ค่านั้นตั้งแต่แรก
  const cbd = searchParams.get("cbd") ?? DEFAULT_CBD;
  const hasFilter = FILTER_KEYS.some((key) => searchParams.get(key));

  /** อัปเดต query string แล้วให้ server component ดึงข้อมูลใหม่ */
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);

    startTransition(() => {
      router.push(next.size ? `?${next}` : "?", { scroll: false });
    });
  };

  const clearFilters = () => {
    startTransition(() => {
      router.push("?", { scroll: false });
    });
  };

  return (
    <header className="relative z-[1200] flex shrink-0 flex-wrap items-stretch gap-x-3 gap-y-2 border-b border-sky-950 bg-sky-800 px-3 py-2.5 shadow-sm sm:items-center sm:px-4 2xl:flex-nowrap">
      {/* กลุ่มตราหน่วยงาน */}
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
          <h1 className="text-sm font-semibold leading-5 text-white sm:text-[15px] sm:whitespace-nowrap">
            EMS - GIS
          </h1>
          <p className="truncate text-[11px] text-sky-100 sm:text-xs sm:whitespace-nowrap">
            สสจ.พิษณุโลก
          </p>
        </div>
      </div>

      <div
        aria-hidden
        className="mx-1 hidden h-9 w-px bg-white/25 lg:block"
      />

      {/* ประเภทเหตุ — ค่าเริ่มต้นคืออุบัติเหตุยานยนต์ ไม่ใช่ "ทุกประเภท"
          เพราะแผนที่นี้ทำมาเพื่อดูอุบัติเหตุทางถนนเป็นหลัก */}
      <select
        aria-label="ประเภทเหตุ"
        value={cbd}
        onChange={(e) => setParam("cbd", e.target.value)}
        className={`${CONTROL_CLASS} w-full min-w-0 cursor-pointer sm:w-auto sm:max-w-56`}
      >
        <option value={ALL_CBD}>ทุกประเภทเหตุ</option>
        {cbdOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>

      {/* ช่วงวันที่ — ใช้คำเชื่อมแทนป้ายกำกับด้านบน
          input[type=date] ไม่รองรับ placeholder เบราว์เซอร์จะโชว์รูปแบบวันที่ให้เอง
          ยังใส่ aria-label ไว้เพื่อให้ screen reader รู้ว่าช่องไหนคือช่องไหน */}
      <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 sm:flex sm:w-auto">
        <input
          type="date"
          aria-label="ตั้งแต่วันที่"
          value={from}
          min={dateBounds.min ?? undefined}
          max={to || (dateBounds.max ?? undefined)}
          onChange={(e) => setParam("from", e.target.value)}
          className={`${CONTROL_CLASS} col-span-2 w-full min-w-0 sm:col-span-1 sm:w-auto`}
        />
        <span className={CONNECTOR}>ถึง</span>
        <input
          type="date"
          aria-label="ถึงวันที่"
          value={to}
          min={from || (dateBounds.min ?? undefined)}
          max={dateBounds.max ?? undefined}
          onChange={(e) => setParam("to", e.target.value)}
          className={`${CONTROL_CLASS} w-full min-w-0 sm:w-auto`}
        />
      </div>

      {/* ตัวเลือกแรก "ทุกอำเภอ" ทำหน้าที่เป็น hint ในตัว */}
      <select
        aria-label="อำเภอ"
        value={district}
        onChange={(e) => setParam("district", e.target.value)}
        className={`${CONTROL_CLASS} w-full min-w-0 cursor-pointer sm:w-auto sm:min-w-40`}
      >
        <option value="">ทุกอำเภอ</option>
        {districts.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <HnSearch points={points} onSelect={onSelectPoint} />

      {hasFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-2.5 text-sm text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9 sm:w-auto"
        >
          {/* ไอคอน SVG ไม่ใช้ emoji เพื่อให้คมทุกความละเอียดและอ่านออกด้วย screen reader */}
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
          ล้างตัวกรอง
        </button>
      )}

      {/* ตัวเลขผลลัพธ์ */}
      <div
        aria-live="polite"
        className={`flex h-10 w-[calc(50%-0.375rem)] items-center justify-center rounded-md bg-white/15 px-2.5 text-sm tabular-nums transition-opacity sm:ml-auto sm:h-auto sm:w-auto sm:py-1.5 ${
          isPending ? "opacity-50" : ""
        }`}
      >
        <span className="font-semibold text-white">{resultCount}</span>
        <span className="text-sky-100">
          {" / "}
          {totalCount} เคส
        </span>
      </div>

      <Link
        href="/accident/upload"
        className="inline-flex h-10 w-[calc(50%-0.375rem)] shrink-0 items-center justify-center rounded-md border border-white/40 bg-sky-950 px-3 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-9 sm:w-auto"
      >
        จัดการข้อมูล
      </Link>
    </header>
  );
}
