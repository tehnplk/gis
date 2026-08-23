"use client";

import { useEffect, useRef, useState } from "react";
import {
  type CalendarCell,
  THAI_MONTHS_LONG,
  THAI_MONTHS_SHORT,
  THAI_WEEKDAYS,
  addDays,
  addMonths,
  buddhistYear,
  clampIso,
  daysInMonth,
  formatThaiFull,
  fromIso,
  isWithin,
  monthGrid,
  todayIso,
} from "./date-utils";

export type DatePreset = { label: string; value: string };

type Props = {
  /** วันที่ที่เลือกอยู่ ("" = ยังไม่เลือก) */
  value: string;
  /** วันที่ที่โฟกัสอยู่ในตาราง เป็นตัวกำหนดว่ากำลังดูเดือนไหน */
  focusedIso: string;
  onFocusedChange: (iso: string) => void;
  onSelect: (iso: string) => void;
  onClose: () => void;
  min?: string | null;
  max?: string | null;
  /** ช่วงที่กำลังเลือกอยู่ ใช้ระบายพื้นหลังให้เห็นว่าคลุมวันไหนบ้าง ไม่ได้บังคับการเลือก */
  rangeFrom?: string | null;
  rangeTo?: string | null;
  /** เปิดด้วยคีย์บอร์ด — ต้องย้ายโฟกัสเข้าตารางให้เลย */
  autoFocusDay: boolean;
  presets?: DatePreset[];
  onClear?: () => void;
};

type View = "day" | "month" | "year";

/** จำนวนปีต่อหนึ่งหน้าในมุมมองเลือกปี */
const YEARS_PER_PAGE = 12;

const NAV_BUTTON =
  "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-600 " +
  "transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500/50 " +
  "disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800";

const CELL =
  "flex h-8 cursor-pointer items-center justify-center rounded-md text-sm tabular-nums " +
  "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 " +
  "disabled:cursor-not-allowed disabled:opacity-30";

const SHORTCUT =
  "cursor-pointer rounded-md px-2 py-1 text-xs text-sky-700 transition-colors hover:bg-sky-50 " +
  "disabled:cursor-not-allowed disabled:opacity-40 dark:text-sky-300 dark:hover:bg-sky-400/10";

const pad2 = (value: number) => String(value).padStart(2, "0");

/** ปีแรกของหน้าที่มีปีนั้นอยู่ — แบ่งหน้าละ 12 ปีให้ลงตัวเสมอ */
function yearPageStart(year: number) {
  return year - (((year % YEARS_PER_PAGE) + YEARS_PER_PAGE) % YEARS_PER_PAGE);
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={direction === "left" ? "M12 4l-6 6 6 6" : "M8 4l6 6-6 6"} />
    </svg>
  );
}

export default function CalendarPanel({
  value,
  focusedIso,
  onFocusedChange,
  onSelect,
  onClose,
  min,
  max,
  rangeFrom,
  rangeTo,
  autoFocusDay,
  presets,
  onClear,
}: Props) {
  const [view, setView] = useState<View>("day");
  const gridRef = useRef<HTMLDivElement>(null);
  const focused = fromIso(focusedIso) ?? new Date();
  const year = focused.getFullYear();
  const month = focused.getMonth();
  const today = todayIso();

  // ย้ายโฟกัสจริงตามช่องที่ active อยู่ ลูกศรจึงเดินต่อได้และ screen reader อ่านวันใหม่ให้
  useEffect(() => {
    if (view !== "day" || !autoFocusDay) return;
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focused="true"]')?.focus();
  }, [view, autoFocusDay, focusedIso]);

  const onGridKeyDown = (event: React.KeyboardEvent) => {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focusedIso, -1),
      ArrowRight: () => addDays(focusedIso, 1),
      ArrowUp: () => addDays(focusedIso, -7),
      ArrowDown: () => addDays(focusedIso, 7),
      PageUp: () => addMonths(focusedIso, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focusedIso, event.shiftKey ? 12 : 1),
      Home: () => `${focusedIso.slice(0, 8)}01`,
      End: () => `${focusedIso.slice(0, 8)}${daysInMonth(year, month)}`,
    };

    const move = moves[event.key];
    if (!move) return;

    event.preventDefault();
    const next = move();
    // ไม่ให้ลูกศรพาหลุดออกนอกช่วงที่อนุญาต ไม่งั้นโฟกัสไปตกบนปุ่ม disabled
    if (isWithin(next, min, max)) onFocusedChange(next);
  };

  /** เดือน/ปีที่ทั้งช่วงอยู่นอก min–max กดเข้าไปก็ไม่มีวันให้เลือก */
  const monthDisabled = (targetYear: number, targetMonth: number) =>
    !isWithin(`${targetYear}-${pad2(targetMonth + 1)}-01`, null, max) ||
    !isWithin(
      `${targetYear}-${pad2(targetMonth + 1)}-${daysInMonth(targetYear, targetMonth)}`,
      min,
      null,
    );

  const yearDisabled = (targetYear: number) =>
    !isWithin(`${targetYear}-01-01`, null, max) ||
    !isWithin(`${targetYear}-12-31`, min, null);

  /** ย้ายไปเดือน/ปีใหม่โดยคงวันเดิมไว้เท่าที่เดือนนั้นมี แล้วหนีบเข้าช่วง */
  const jumpTo = (targetYear: number, targetMonth: number) => {
    const day = Math.min(focused.getDate(), daysInMonth(targetYear, targetMonth));
    onFocusedChange(
      clampIso(`${targetYear}-${pad2(targetMonth + 1)}-${pad2(day)}`, min, max),
    );
  };

  /** ปุ่ม ‹ › เปลี่ยนความหมายตามมุมมอง: ทีละเดือน → ทีละปี → ทีละหน้า 12 ปี */
  const step = (direction: -1 | 1) => {
    if (view === "day") onFocusedChange(addMonths(focusedIso, direction));
    else if (view === "month") jumpTo(year + direction, month);
    else jumpTo(year + direction * YEARS_PER_PAGE, month);
  };

  /** สีพื้นของช่องวัน ลำดับความสำคัญ: วันที่เลือก > ปลายช่วง > ในช่วง > วันนี้ */
  const dayClass = (cell: CalendarCell, disabled: boolean) => {
    if (cell.iso === value) return "bg-sky-600 font-semibold text-white";

    const highlight =
      cell.iso === rangeFrom || cell.iso === rangeTo
        ? "bg-sky-500/25 font-semibold dark:bg-sky-400/25"
        : rangeFrom && rangeTo && cell.iso > rangeFrom && cell.iso < rangeTo
          ? "bg-sky-500/10 dark:bg-sky-400/15"
          : "";

    return [
      highlight,
      cell.inMonth ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-600",
      cell.iso === today ? "ring-1 ring-sky-500/60 ring-inset" : "",
      disabled ? "" : "hover:bg-slate-100 dark:hover:bg-slate-800",
    ].join(" ");
  };

  const cells = monthGrid(year, month);
  const rows: CalendarCell[][] = Array.from({ length: 6 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );

  const pageStart = yearPageStart(year);
  const headerLabel =
    view === "day"
      ? `${THAI_MONTHS_LONG[month]} ${buddhistYear(year)}`
      : view === "month"
        ? String(buddhistYear(year))
        : `${buddhistYear(pageStart)} – ${buddhistYear(pageStart + YEARS_PER_PAGE - 1)}`;

  return (
    <div
      className="w-[17.5rem] rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        onClose();
      }}
    >
      {/* แถบหัว — กดที่ชื่อเดือนเพื่อไต่ขึ้นไปเลือกเดือนแล้วเลือกปี
          ข้ามไปปีไกลๆ ได้ในสองคลิก แทนที่จะกดลูกศรทีละเดือน */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="ก่อนหน้า"
          onClick={() => step(-1)}
          className={NAV_BUTTON}
        >
          <Chevron direction="left" />
        </button>

        <button
          type="button"
          aria-label={`${headerLabel} — เปลี่ยนมุมมอง`}
          onClick={() =>
            setView(view === "day" ? "month" : view === "month" ? "year" : "day")
          }
          className="flex h-8 flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2 text-sm font-semibold text-slate-800 transition-colors outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          {headerLabel}
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className={`size-3.5 transition-transform ${view === "day" ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </button>

        <button type="button" aria-label="ถัดไป" onClick={() => step(1)} className={NAV_BUTTON}>
          <Chevron direction="right" />
        </button>
      </div>

      {view === "day" && (
        <>
          <div className="mt-1.5 grid grid-cols-7 text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {THAI_WEEKDAYS.map((label, index) => (
              <span key={label} className={index === 0 ? "text-rose-500/80" : undefined}>
                {label}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            role="grid"
            aria-label="ปฏิทิน"
            onKeyDown={onGridKeyDown}
            className="mt-0.5"
          >
            {rows.map((row) => (
              <div key={row[0].iso} role="row" className="grid grid-cols-7">
                {row.map((cell) => {
                  const disabled = !isWithin(cell.iso, min, max);
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      role="gridcell"
                      disabled={disabled}
                      data-focused={cell.iso === focusedIso}
                      // roving tabindex — Tab เข้าออกตารางครั้งเดียว ที่เหลือเดินด้วยลูกศร
                      tabIndex={cell.iso === focusedIso ? 0 : -1}
                      aria-selected={cell.iso === value}
                      aria-label={formatThaiFull(cell.iso)}
                      aria-current={cell.iso === today ? "date" : undefined}
                      onClick={() => onSelect(cell.iso)}
                      onFocus={() => onFocusedChange(cell.iso)}
                      className={`${CELL} ${dayClass(cell, disabled)}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {view === "month" && (
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {THAI_MONTHS_SHORT.map((label, index) => (
            <button
              key={label}
              type="button"
              disabled={monthDisabled(year, index)}
              aria-current={index === month ? "true" : undefined}
              onClick={() => {
                jumpTo(year, index);
                setView("day");
              }}
              className={`${CELL} h-9 ${
                index === month
                  ? "bg-sky-600 font-semibold text-white"
                  : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {view === "year" && (
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {Array.from({ length: YEARS_PER_PAGE }, (_, index) => pageStart + index).map(
            (targetYear) => (
              <button
                key={targetYear}
                type="button"
                disabled={yearDisabled(targetYear)}
                aria-current={targetYear === year ? "true" : undefined}
                onClick={() => {
                  jumpTo(targetYear, month);
                  setView("month");
                }}
                className={`${CELL} h-9 ${
                  targetYear === year
                    ? "bg-sky-600 font-semibold text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {buddhistYear(targetYear)}
              </button>
            ),
          )}
        </div>
      )}

      {/* ทางลัดล่างสุด — สิ่งที่ผู้ใช้กดบ่อยกว่าการไล่หาวันในตาราง */}
      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-200 pt-2 dark:border-slate-700">
        {presets?.map((preset) => (
          <button
            key={preset.label}
            type="button"
            disabled={!isWithin(preset.value, min, max)}
            onClick={() => onSelect(preset.value)}
            className={SHORTCUT}
          >
            {preset.label}
          </button>
        ))}

        <button
          type="button"
          disabled={!isWithin(today, min, max)}
          onClick={() => onSelect(today)}
          className={SHORTCUT}
        >
          วันนี้
        </button>

        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto cursor-pointer rounded-md px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            ล้าง
          </button>
        )}
      </div>
    </div>
  );
}
