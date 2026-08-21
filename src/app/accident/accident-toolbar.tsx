"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { AccidentPoint } from "./accident-data";
import NameSearch from "./name-search";

type Props = {
  /** จุดที่แสดงอยู่ตอนนี้ ใช้เป็นตัวเลือกของ autocomplete */
  points: AccidentPoint[];
  onSelectPoint: (point: AccidentPoint) => void;
  districts: string[];
  /** ช่วงวันที่ของข้อมูลทั้งหมด ใช้จำกัดขอบเขตของ input */
  dateBounds: { min: string | null; max: string | null };
  resultCount: number;
  totalCount: number;
};

const FILTER_KEYS = ["from", "to", "district"] as const;

/**
 * ช่องกรอกทุกช่องใช้คลาสชุดเดียวกัน ความสูงจึงเท่ากันหมดและมี focus ring ที่มองเห็นได้
 * (ค่าเริ่มต้นของเบราว์เซอร์บน input[type=date] ไม่สม่ำเสมอ)
 */
export const CONTROL_CLASS =
  "h-9 rounded-md border border-sky-900/25 bg-white px-2.5 text-sm text-slate-900 " +
  "transition-colors outline-none focus-visible:border-white focus-visible:ring-2 " +
  "focus-visible:ring-white/70";

/** คำเชื่อมระหว่างช่องวันที่ ทำหน้าที่เป็นป้ายกำกับในตัว */
const CONNECTOR = "text-sm text-sky-100";

export default function AccidentToolbar({
  points,
  onSelectPoint,
  districts,
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
    <header className="relative z-[1200] flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-sky-950 bg-sky-800 px-4 py-2.5 shadow-sm">
      {/* กลุ่มตราหน่วยงาน */}
      <div className="flex items-center gap-2.5">
        <Image
          src="/logo.png"
          alt="ตราสำนักงานปลัดกระทรวงสาธารณสุข"
          width={38}
          height={38}
          priority
          className="shrink-0"
        />
        <div className="leading-tight">
          <h1 className="text-[15px] font-semibold whitespace-nowrap text-white">
            แผนที่จุดเกิดอุบัติเหตุทางถนน
          </h1>
          <p className="text-xs whitespace-nowrap text-sky-100">
            สำนักงานสาธารณสุขจังหวัดพิษณุโลก
          </p>
        </div>
      </div>

      <div
        aria-hidden
        className="mx-1 hidden h-9 w-px bg-white/25 lg:block"
      />

      {/* ช่วงวันที่ — ใช้คำเชื่อมแทนป้ายกำกับด้านบน
          input[type=date] ไม่รองรับ placeholder เบราว์เซอร์จะโชว์รูปแบบวันที่ให้เอง
          ยังใส่ aria-label ไว้เพื่อให้ screen reader รู้ว่าช่องไหนคือช่องไหน */}
      <div className="flex items-center gap-2">
        <span className={CONNECTOR}>ระหว่าง</span>
        <input
          type="date"
          aria-label="ตั้งแต่วันที่"
          value={from}
          min={dateBounds.min ?? undefined}
          max={to || (dateBounds.max ?? undefined)}
          onChange={(e) => setParam("from", e.target.value)}
          className={CONTROL_CLASS}
        />
        <span className={CONNECTOR}>ถึง</span>
        <input
          type="date"
          aria-label="ถึงวันที่"
          value={to}
          min={from || (dateBounds.min ?? undefined)}
          max={dateBounds.max ?? undefined}
          onChange={(e) => setParam("to", e.target.value)}
          className={CONTROL_CLASS}
        />
      </div>

      {/* ตัวเลือกแรก "ทุกอำเภอ" ทำหน้าที่เป็น hint ในตัว */}
      <select
        aria-label="อำเภอ"
        value={district}
        onChange={(e) => setParam("district", e.target.value)}
        className={`${CONTROL_CLASS} min-w-40 cursor-pointer`}
      >
        <option value="">ทุกอำเภอ</option>
        {districts.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <NameSearch points={points} onSelect={onSelectPoint} />

      {hasFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-white/40 bg-white/10 px-2.5 text-sm text-white transition-colors outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
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
        className={`ml-auto rounded-md bg-white/15 px-2.5 py-1.5 text-sm tabular-nums transition-opacity ${
          isPending ? "opacity-50" : ""
        }`}
      >
        <span className="font-semibold text-white">{resultCount}</span>
        <span className="text-sky-100">
          {" / "}
          {totalCount} จุด
        </span>
      </div>
    </header>
  );
}
