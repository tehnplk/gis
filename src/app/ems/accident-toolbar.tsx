"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { DatePicker, addDays, todayIso } from "@/components/datepicker";
import {
  CONTROL_CLASS,
  GHOST_BUTTON_CLASS,
  MapTopbar,
  TopbarCount,
} from "@/components/map-topbar";
import type { AccidentPoint } from "./accident-data";
import { ALL_CBD, DEFAULT_CBD, type CbdOption } from "./cbd";
import HnSearch from "./hn-search";
import UserMenu from "@/components/user-menu";

type Props = {
  /** จุดที่แสดงอยู่ตอนนี้ ใช้เป็นตัวเลือกของ autocomplete */
  points: AccidentPoint[];
  onSelectPoint: (point: AccidentPoint) => void;
  districts: string[];
  /** ประเภทเหตุที่มีข้อมูลจริง เรียงจากพบมากไปน้อย */
  cbdOptions: CbdOption[];
  /** ผู้ใช้ที่เข้าสู่ระบบอยู่ ใช้แสดงอวาตาร์และเมนูบัญชี */
  user: { name: string; role?: string } | null;
  /** ช่วงวันที่ของข้อมูลทั้งหมด ใช้จำกัดขอบเขตของ input */
  dateBounds: { min: string | null; max: string | null };
  resultCount: number;
  totalCount: number;
  /** กดล้างตัวกรองแล้ว — ให้แผนที่กลับไปมุมมองเริ่มต้น */
  onClearFilters: () => void;
};

const FILTER_KEYS = ["from", "to", "district", "cbd"] as const;

/**
 * DatePicker ห่อ input ไว้ใน div — `focus-visible` ไม่ทำงานกับ div ที่โฟกัสไม่ได้
 * จึงสลับเป็น `focus-within` เพื่อให้ขอบไฮไลต์ตอนเคอร์เซอร์อยู่ในช่องเหมือนช่องอื่น
 */
const DATE_FIELD_CLASS = CONTROL_CLASS.replaceAll("focus-visible:", "focus-within:");

export default function AccidentToolbar({
  points,
  onSelectPoint,
  districts,
  cbdOptions,
  user,
  dateBounds,
  resultCount,
  totalCount,
  onClearFilters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const district = searchParams.get("district") ?? "";
  // ไม่มีพารามิเตอร์ = ดูอุบัติเหตุยานยนต์ ต้องให้ select โชว์ค่านั้นตั้งแต่แรก
  const cbd = searchParams.get("cbd") ?? DEFAULT_CBD;

  // HN ไม่ได้อยู่ใน query string เพราะมันสั่งแผนที่ ไม่ได้กรองข้อมูล
  // แต่ผู้ใช้มองว่าเป็นตัวกรองเหมือนกัน ปุ่มล้างจึงต้องขึ้นด้วย
  const [hnQuery, setHnQuery] = useState("");
  const hasFilter =
    FILTER_KEYS.some((key) => searchParams.get(key)) || hnQuery.trim() !== "";

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
    setHnQuery("");
    onClearFilters();
    startTransition(() => {
      router.push("?", { scroll: false });
    });
  };

  return (
    <MapTopbar title="EMS - GIS">
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

      {/* ช่วงวันที่ — placeholder ในช่องบอกอยู่แล้วว่าช่องไหนต้นทาง/ปลายทาง
          ใช้ DatePicker ของโปรเจกต์แทน input[type=date] เพราะต้องการ พ.ศ.
          ปฏิทินหน้าตาเดียวกันทุกเบราว์เซอร์ และเห็นช่วงที่เลือกเป็นแถบเดียวกัน */}
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
        <div className="w-full min-w-0 sm:w-40">
          <DatePicker
            label="ตั้งแต่วันที่"
            placeholder="ตั้งแต่วันที่"
            value={from}
            min={dateBounds.min ?? undefined}
            max={to || (dateBounds.max ?? undefined)}
            rangeFrom={from || undefined}
            rangeTo={to || undefined}
            presets={[
              { label: "7 วันล่าสุด", value: addDays(todayIso(), -6) },
              { label: "30 วันล่าสุด", value: addDays(todayIso(), -29) },
            ]}
            onChange={(iso) => setParam("from", iso)}
            className={DATE_FIELD_CLASS}
          />
        </div>

        <div className="w-full min-w-0 sm:w-40">
          <DatePicker
            label="ถึงวันที่"
            placeholder="ถึงวันที่"
            value={to}
            min={from || (dateBounds.min ?? undefined)}
            max={dateBounds.max ?? undefined}
            rangeFrom={from || undefined}
            rangeTo={to || undefined}
            onChange={(iso) => setParam("to", iso)}
            className={DATE_FIELD_CLASS}
          />
        </div>
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

      <HnSearch
        points={points}
        onSelect={onSelectPoint}
        query={hnQuery}
        onQueryChange={setHnQuery}
      />

      {hasFilter && (
        <button
          type="button"
          onClick={clearFilters}
          className={`${GHOST_BUTTON_CLASS} w-full sm:w-auto`}
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

      {/* ตัวเลขผลลัพธ์กับอวาตาร์อยู่กลุ่มเดียวกัน ไม่งั้นเวลา header ขึ้นบรรทัดใหม่
          อวาตาร์จะหลุดไปอยู่คนละแถวกับตัวเลข ดูเหมือนหลงมาจากที่อื่น */}
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
        <TopbarCount dim={isPending}>
          <span className="font-semibold text-white">{resultCount}</span>
          <span className="text-sky-100">
            {" / "}
            {totalCount} เคส
          </span>
        </TopbarCount>

        {user && (
          <UserMenu
            name={user.name}
            role={user.role}
            links={[{ href: "/ems/upload", label: "จัดการข้อมูล" }]}
          />
        )}
      </div>
    </MapTopbar>
  );
}
