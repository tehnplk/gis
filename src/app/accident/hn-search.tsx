"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AccidentPoint } from "./accident-data";
import { CONTROL_CLASS } from "./accident-toolbar";
import { triageColor } from "./triage";

const MAX_SUGGESTIONS = 8;

/** วันที่แบบสั้นในรายการผลค้นหา ไม่ต้องละเอียดถึงวินาที */
const DATE_FORMAT = new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

type Props = {
  points: AccidentPoint[];
  onSelect: (point: AccidentPoint) => void;
};

export default function HnSearch({ points, onSelect }: Props) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const matched: { point: AccidentPoint; exactPrefix: boolean }[] = [];
    for (const point of points) {
      const hn = point.hn?.toLowerCase();
      if (!hn || !hn.includes(needle)) continue;
      matched.push({ point, exactPrefix: hn.startsWith(needle) });
    }

    // HN ที่ขึ้นต้นตรงกับที่พิมพ์มักเป็นตัวที่ผู้ใช้ต้องการ จึงดันขึ้นก่อน
    // ที่เหลือคงลำดับเดิม (เหตุล่าสุดก่อน) เพราะ sort ของ JS เสถียร
    matched.sort((a, b) => Number(b.exactPrefix) - Number(a.exactPrefix));
    return matched.slice(0, MAX_SUGGESTIONS).map((row) => row.point);
  }, [points, query]);

  // คลิกนอกกล่องแล้วปิดรายการ
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const choose = (point: AccidentPoint) => {
    setQuery(point.hn ?? "");
    setOpen(false);
    onSelect(point);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = suggestions[activeIndex];
      if (picked) choose(picked);
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative flex w-full items-center sm:w-auto">
      {/* ไอคอนแว่นขยายวางทับในช่อง จึงต้องเผื่อ padding ซ้ายให้ข้อความ */}
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="9" cy="9" r="5.5" />
        <path d="M13.2 13.2L17 17" />
      </svg>

      <input
        id={`${listId}-input`}
        type="search"
        role="combobox"
        aria-label="ค้นหา HN"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && suggestions.length > 0
            ? `${listId}-option-${activeIndex}`
            : undefined
        }
        autoComplete="off"
        placeholder="ค้นด้วย HN"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          // รีเซ็ตตรงนี้แทนใน effect กัน index ค้างเกินขอบรายการใหม่
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={`${CONTROL_CLASS} w-full min-w-0 pl-8 sm:w-56`}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full left-0 z-[1100] mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg sm:w-72 dark:border-slate-700 dark:bg-slate-900"
        >
          {suggestions.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
              ไม่พบ HN ที่ค้นหา
            </li>
          )}

          {suggestions.map((point, index) => (
            <li
              key={point.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // ใช้ onPointerDown เพื่อให้เลือกได้ก่อน input จะ blur
              onPointerDown={(e) => {
                e.preventDefault();
                choose(point);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                index === activeIndex ? "bg-sky-700/10 dark:bg-sky-400/15" : ""
              }`}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full border border-black/20 dark:border-white/30"
                style={{ backgroundColor: triageColor(point.triage) }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate tabular-nums">
                  HN {point.hn}
                </span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {[
                    DATE_FORMAT.format(new Date(point.incidentDatetime)),
                    point.district && `อ.${point.district}`,
                    point.place,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
