"use client";

import { useId, useState } from "react";
import { BASE_MAPS } from "./basemaps";

/**
 * สลับแผนที่ฐาน — แยกเป็นตัวลอยอิสระ ไม่ขึ้นกับแผงควบคุม
 * จึงยังใช้ได้แม้ผู้ใช้ยุบแผงชั้นข้อมูลไปแล้ว
 */
export default function BasemapSwitch({
  activeId,
  onChange,
}: {
  activeId: string;
  onChange: (id: string) => void;
}) {
  const listId = useId();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeMap = BASE_MAPS.find((map) => map.id === activeId) ?? BASE_MAPS[0];

  return (
    <div className="pointer-events-auto relative min-w-0 flex-1 sm:flex-none">
      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls={listId}
        onClick={() => setMobileOpen((open) => !open)}
        className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-medium text-foreground shadow-md sm:hidden dark:border-white/20 dark:bg-neutral-900"
      >
        <span className="truncate">แผนที่ฐาน: {activeMap.label}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`size-4 shrink-0 transition-transform ${mobileOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 8 4 4 4-4" />
        </svg>
      </button>

      <div
        id={listId}
        role="tablist"
        aria-label="เลือกแผนที่ฐาน"
        className={`${mobileOpen ? "flex" : "hidden"} absolute left-0 top-full z-10 mt-2 w-full flex-col overflow-hidden rounded-lg border border-black/15 bg-white shadow-lg sm:static sm:mt-0 sm:flex sm:w-auto sm:flex-row sm:shadow-md dark:border-white/20 dark:bg-neutral-900`}
      >
        {BASE_MAPS.map((map) => {
          const selected = map.id === activeId;
          return (
            <button
              key={map.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                onChange(map.id);
                setMobileOpen(false);
              }}
              className={`min-w-0 flex-1 overflow-hidden px-3 py-2 text-left text-sm font-medium text-ellipsis whitespace-nowrap transition-colors sm:flex-none sm:py-1.5 sm:text-center ${
                selected
                  ? "bg-blue-600 text-white"
                  : "text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {map.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
