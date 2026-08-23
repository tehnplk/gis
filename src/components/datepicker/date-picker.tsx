"use client";

import { useEffect, useId, useRef, useState } from "react";
import CalendarPanel, { type DatePreset } from "./calendar-panel";
import {
  clampIso,
  formatEditable,
  formatThaiLong,
  isWithin,
  parseThaiInput,
  todayIso,
} from "./date-utils";

/**
 * ช่องเลือกวันที่ที่ทดแทน input[type=date] ของเบราว์เซอร์
 *
 * ที่ต่างจากของเบราว์เซอร์:
 * - แสดงผลเป็น พ.ศ. รูปแบบเดียวตลอด ("23/08/2569") ส่วนค่าที่ส่งออกยังเป็น ISO
 * - พิมพ์เองได้หลายรูปแบบ (23/8/69, 23-08-2569, 23082569, เลขไทย) ไม่ต้องเดินตามช่อง
 * - หัวปฏิทินกดเพื่อเลือกเดือน/ปีได้ ไม่ต้องกดลูกศรทีละเดือน
 * - หน้าตาเหมือนกันทุกเบราว์เซอร์ ระบายช่วงวันที่เลือกได้ และใส่ทางลัดเองได้
 */
type Props = {
  /** ค่า ISO "YYYY-MM-DD" หรือ "" เมื่อยังไม่เลือก */
  value: string;
  onChange: (iso: string) => void;
  /** ป้ายกำกับสำหรับ screen reader */
  label?: string;
  placeholder?: string;
  min?: string | null;
  max?: string | null;
  /** ระบายพื้นหลังช่วง from–to ในปฏิทิน ใช้ตอนวางคู่กันเป็นช่วงวันที่ */
  rangeFrom?: string | null;
  rangeTo?: string | null;
  presets?: DatePreset[];
  disabled?: boolean;
  /** แสดงปุ่มกากบาทและปุ่ม "ล้าง" (ค่าเริ่มต้น: แสดง) */
  clearable?: boolean;
  /** ใส่ชื่อเพื่อส่งค่าไปกับ form แบบ input ปกติ */
  name?: string;
  /**
   * คลาสของกรอบช่อง — ถ้าส่งมาจะ "แทนที่" ชุดสีเริ่มต้นทั้งหมด
   * (ไม่ใช่ต่อท้าย เพราะ Tailwind ตัดสินคลาสที่ชนกันจากลำดับใน CSS ไม่ใช่ลำดับที่เขียน)
   */
  className?: string;
};

/** ชุดสีเริ่มต้นของกรอบช่อง ส่ง className มาทับได้ทั้งชุด */
export const DATEPICKER_FIELD_CLASS =
  "h-10 rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 sm:h-9 " +
  "focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/40";

/** โครงของกรอบช่อง ส่วนที่ห้ามหาย ไม่ว่าจะส่ง className อะไรมา */
const FIELD_LAYOUT = "flex items-center gap-1 transition-colors";

/** ขนาดโดยประมาณของแผงปฏิทิน ใช้ตัดสินว่าจะกางขึ้นหรือลง */
const PANEL_HEIGHT = 340;
const PANEL_WIDTH = 280;

export default function DatePicker({
  value,
  onChange,
  label,
  placeholder = "วว/ดด/ปปปป",
  min,
  max,
  rangeFrom,
  rangeTo,
  presets,
  disabled,
  clearable = true,
  name,
  className,
}: Props) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** กันไม่ให้แผงเด้งเปิดอีกรอบตอนคืนโฟกัสให้ช่องกรอกหลังเลือกวัน */
  const skipFocusOpenRef = useRef(false);

  const [open, setOpen] = useState(false);
  /** ข้อความระหว่างที่ผู้ใช้กำลังพิมพ์ — null = ให้แสดงค่าที่จัดรูปแบบแล้ว */
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [focusedIso, setFocusedIso] = useState(() => value || todayIso());
  const [autoFocusDay, setAutoFocusDay] = useState(false);
  const [placement, setPlacement] = useState({ up: false, right: false });

  const openPanel = (moveFocusToGrid: boolean) => {
    if (disabled) return;

    // ตั้งวันตั้งต้นตอนเปิดทุกครั้ง เผื่อค่าถูกเปลี่ยนจากที่อื่นระหว่างที่แผงปิดอยู่
    setFocusedIso(clampIso(value || todayIso(), min, max));
    setAutoFocusDay(moveFocusToGrid);

    // วัดที่ว่างรอบช่องตอนเปิด แผงจะได้ไม่ทะลุขอบจอ
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setPlacement({
        up: window.innerHeight - rect.bottom < PANEL_HEIGHT && rect.top > PANEL_HEIGHT,
        right: rect.left + PANEL_WIDTH > window.innerWidth,
      });
    }

    setOpen(true);
  };

  const closePanel = (returnFocus: boolean) => {
    setOpen(false);
    setAutoFocusDay(false);
    if (!returnFocus) return;
    skipFocusOpenRef.current = true;
    inputRef.current?.focus();
  };

  /** อ่านสิ่งที่พิมพ์แล้วส่งออกเป็น ISO — อ่านไม่ออกหรือนอกช่วงจะคาข้อความไว้ให้แก้ */
  const commitDraft = () => {
    if (draft === null) return;

    const text = draft.trim();
    if (!text) {
      setDraft(null);
      setInvalid(false);
      if (value) onChange("");
      return;
    }

    const parsed = parseThaiInput(text);
    if (!parsed || !isWithin(parsed, min, max)) {
      setInvalid(true);
      return;
    }

    setDraft(null);
    setInvalid(false);
    if (parsed !== value) onChange(parsed);
  };

  const choose = (iso: string) => {
    setDraft(formatEditable(iso));
    setInvalid(false);
    onChange(iso);
    closePanel(true);
  };

  const clear = () => {
    setDraft("");
    setInvalid(false);
    onChange("");
    closePanel(true);
  };

  // คลิกนอกกล่องแล้วปิด — แพทเทิร์นเดียวกับช่องค้น HN และเมนูผู้ใช้
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setAutoFocusDay(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openPanel(true);
    } else if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      setOpen(false);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setAutoFocusDay(false);
    }
  };

  // รูปแบบเดียวตลอด ไม่ว่าจะกำลังพิมพ์อยู่หรือไม่ — สลับไปมาแล้วผู้ใช้สับสนว่าค่าเปลี่ยน
  const text = draft ?? (value ? formatEditable(value) : "");

  return (
    <div ref={containerRef} className="relative">
      {name && <input type="hidden" name={name} value={value} />}

      <div
        className={`${FIELD_LAYOUT} ${className ?? DATEPICKER_FIELD_CLASS} ${
          invalid ? "border-rose-500 ring-2 ring-rose-500/30" : ""
        } ${disabled ? "opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          role="combobox"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-invalid={invalid || undefined}
          title={invalid ? "รูปแบบวันที่ไม่ถูกต้อง" : formatThaiLong(value)}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
          onChange={(event) => {
            setDraft(event.target.value);
            setInvalid(false);
          }}
          onFocus={(event) => {
            // คืนโฟกัสหลังเลือกวัน/ล้างค่า — อย่าเปิดแผงซ้ำและอย่าเลือกข้อความทั้งช่อง
            if (skipFocusOpenRef.current) {
              skipFocusOpenRef.current = false;
              return;
            }
            event.target.select();
            openPanel(false);
          }}
          onBlur={commitDraft}
          onKeyDown={onInputKeyDown}
          className="w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:text-slate-400"
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            aria-label="ล้างวันที่"
            onClick={clear}
            className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-current opacity-45 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100"
          >
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l8 8M14 6l-8 8" />
            </svg>
          </button>
        )}

        <button
          type="button"
          aria-label={open ? "ปิดปฏิทิน" : "เปิดปฏิทิน"}
          disabled={disabled}
          // ช่องกรอกยังโฟกัสอยู่ตอนกดปุ่มนี้ ถ้าปล่อยให้ blur จะปิด-เปิดสลับกันเอง
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? closePanel(true) : openPanel(true))}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-current opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100 disabled:cursor-not-allowed"
        >
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <path d="M3 8.5h14M7 3v3M13 3v3" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={label ? `ปฏิทิน${label}` : "ปฏิทิน"}
          className={`absolute z-[1300] ${placement.up ? "bottom-full mb-1" : "top-full mt-1"} ${
            placement.right ? "right-0" : "left-0"
          }`}
        >
          <CalendarPanel
            value={value}
            focusedIso={focusedIso}
            onFocusedChange={setFocusedIso}
            onSelect={choose}
            onClose={() => closePanel(true)}
            min={min}
            max={max}
            rangeFrom={rangeFrom}
            rangeTo={rangeTo}
            autoFocusDay={autoFocusDay}
            presets={presets}
            onClear={clearable ? clear : undefined}
          />
        </div>
      )}
    </div>
  );
}
