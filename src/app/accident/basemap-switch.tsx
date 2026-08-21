"use client";

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
  return (
    <div
      role="tablist"
      aria-label="เลือกแผนที่ฐาน"
      className="pointer-events-auto flex overflow-hidden rounded-lg border border-black/15 bg-white shadow-md dark:border-white/20 dark:bg-neutral-900"
    >
      {BASE_MAPS.map((map) => {
        const selected = map.id === activeId;
        return (
          <button
            key={map.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(map.id)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
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
  );
}
