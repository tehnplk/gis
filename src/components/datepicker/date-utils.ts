/**
 * ยูทิลิตี้วันที่ของ DatePicker — คุยกับภายนอกด้วยสตริง ISO "YYYY-MM-DD" เสมอ
 * (รูปแบบเดียวกับที่ query string และฐานข้อมูลใช้ จึงไม่ต้องแปลงไปมา)
 *
 * ห้ามใช้ `new Date("2026-08-23")` เพราะ JS ตีความว่าเป็น UTC เที่ยงคืน
 * พอ +07:00 แล้วอาจเลื่อนไปวันก่อนหน้า ที่นี่จึงประกอบ Date จากเลขปี/เดือน/วันตรงๆ
 */

export const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const THAI_MONTHS_LONG = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

/** หัวคอลัมน์ปฏิทิน เริ่มวันอาทิตย์ตามปฏิทินไทย */
export const THAI_WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** ชื่อเต็มของวัน ใช้ใน aria-label ของช่องวันที่ */
const THAI_WEEKDAYS_LONG = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** พ.ศ. จากปี ค.ศ. — ทุกอย่างที่ผู้ใช้เห็นเป็น พ.ศ. ส่วนค่าที่ส่งออกเป็น ค.ศ. */
export function buddhistYear(gregorianYear: number) {
  return gregorianYear + 543;
}

export function toIso(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** คืน null ถ้าสตริงผิดรูปแบบหรือเป็นวันที่ไม่มีจริง เช่น "2026-02-31" */
export function fromIso(iso: string | null | undefined): Date | null {
  if (!iso || !ISO_PATTERN.test(iso)) return null;

  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  // Date ปัดวันที่เกินเดือนไปเดือนถัดไปเงียบๆ จึงต้องเช็คย้อนกลับว่าตรงกับที่ขอ
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function todayIso() {
  return toIso(new Date());
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function addDays(iso: string, days: number) {
  const date = fromIso(iso);
  if (!date) return iso;
  date.setDate(date.getDate() + days);
  return toIso(date);
}

/** บวกเดือนแบบหนีบวันที่ — 31 ม.ค. + 1 เดือน = 28/29 ก.พ. ไม่ใช่ 2 มี.ค. */
export function addMonths(iso: string, months: number) {
  const date = fromIso(iso);
  if (!date) return iso;

  const year = date.getFullYear();
  const month = date.getMonth() + months;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;

  return `${targetYear}-${pad(targetMonth + 1)}-${pad(
    Math.min(date.getDate(), daysInMonth(targetYear, targetMonth)),
  )}`;
}

/** ISO เรียงตามพจนานุกรมได้ตรงกับลำดับเวลา จึงเทียบด้วย < > ได้เลย */
export function isWithin(iso: string, min?: string | null, max?: string | null) {
  if (min && iso < min) return false;
  if (max && iso > max) return false;
  return true;
}

export function clampIso(iso: string, min?: string | null, max?: string | null) {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

/** "2026-08-23" → "23 ส.ค. 2569" — รูปแบบที่แสดงในช่องกรอกตอนไม่ได้แก้ไข */
export function formatThai(iso: string) {
  const date = fromIso(iso);
  if (!date) return "";
  return `${date.getDate()} ${THAI_MONTHS_SHORT[date.getMonth()]} ${buddhistYear(
    date.getFullYear(),
  )}`;
}

/** "23 สิงหาคม 2569" — ใช้กับ screen reader และหัวปฏิทิน */
export function formatThaiLong(iso: string) {
  const date = fromIso(iso);
  if (!date) return "";
  return `${date.getDate()} ${THAI_MONTHS_LONG[date.getMonth()]} ${buddhistYear(
    date.getFullYear(),
  )}`;
}

/** "วันอาทิตย์ที่ 23 สิงหาคม 2569" */
export function formatThaiFull(iso: string) {
  const date = fromIso(iso);
  if (!date) return "";
  return `วัน${THAI_WEEKDAYS_LONG[date.getDay()]}ที่ ${formatThaiLong(iso)}`;
}

/** รูปแบบที่ใส่ให้ผู้ใช้แก้ไขในช่องกรอก — ตัวเลขล้วน พิมพ์ทับง่ายกว่าชื่อเดือน */
export function formatEditable(iso: string) {
  const date = fromIso(iso);
  if (!date) return "";
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${buddhistYear(
    date.getFullYear(),
  )}`;
}

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/**
 * ปีที่ผู้ใช้พิมพ์อาจมาได้ 3 แบบ — แปลงให้เป็น ค.ศ. ทั้งหมด
 * - 2 หลัก (68, 69) คนไทยหมายถึง พ.ศ. ย่อเสมอ → 2568, 2569
 * - 4 หลักที่มากกว่า 2400 คือ พ.ศ. → ลบ 543
 * - ที่เหลือคือ ค.ศ. อยู่แล้ว
 */
function normalizeYear(year: number) {
  const full = year < 100 ? 2500 + year : year;
  return full > 2400 ? full - 543 : full;
}

function build(day: number, month: number, year: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const gregorian = normalizeYear(year);
  if (day > daysInMonth(gregorian, month - 1)) return null;
  return `${gregorian}-${pad(month)}-${pad(day)}`;
}

/**
 * แปลงสิ่งที่ผู้ใช้พิมพ์เป็น ISO — ยอมรับได้กว้างกว่า input[type=date] มาก
 * "23/8/69" "23-08-2569" "23.8.2026" "23 8" (ปีนี้) "23082569" "2026-08-23"
 * เลขไทย ๒๓/๘/๖๙ ก็ได้ คืน null เมื่ออ่านไม่ออกหรือเป็นวันที่ไม่มีจริง
 */
export function parseThaiInput(text: string): string | null {
  const cleaned = text
    .trim()
    .replace(/[๐-๙]/g, (digit) => String(THAI_DIGITS.indexOf(digit)))
    .replace(/\s+/g, " ");
  if (!cleaned) return null;

  // ปี-เดือน-วัน (ISO หรือพิมพ์ตามนั้น) — ดูจากบล็อกแรกที่ยาว 4 หลัก
  const ymd = cleaned.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/);
  if (ymd) return build(Number(ymd[3]), Number(ymd[2]), Number(ymd[1]));

  // วัน-เดือน-ปี รูปแบบที่คนไทยพิมพ์บ่อยที่สุด ปีละไว้ได้ = ปีนี้
  const dmy = cleaned.match(/^(\d{1,2})[-/. ](\d{1,2})(?:[-/. ](\d{2}|\d{4}))?$/);
  if (dmy) {
    const year = dmy[3] ? Number(dmy[3]) : new Date().getFullYear();
    return build(Number(dmy[1]), Number(dmy[2]), year);
  }

  // ตัวเลขล้วน 8 หลักจากการก๊อปวาง — "23082569" กับ "20260823" หน้าตาเหมือนกัน
  // จึงลองอ่านแบบที่คนไทยพิมพ์ (ddmmyyyy) ก่อน ไม่ได้วันจริงค่อยตกไปอ่านเป็น yyyymmdd
  if (/^\d{8}$/.test(cleaned)) {
    return (
      build(
        Number(cleaned.slice(0, 2)),
        Number(cleaned.slice(2, 4)),
        Number(cleaned.slice(4, 8)),
      ) ?? build(Number(cleaned.slice(6, 8)), Number(cleaned.slice(4, 6)), Number(cleaned.slice(0, 4)))
    );
  }
  if (/^\d{6}$/.test(cleaned)) {
    return build(
      Number(cleaned.slice(0, 2)),
      Number(cleaned.slice(2, 4)),
      Number(cleaned.slice(4, 6)),
    );
  }

  return null;
}

export type CalendarCell = {
  iso: string;
  day: number;
  /** false = วันของเดือนก่อน/ถัดไปที่โผล่มาเติมสัปดาห์ */
  inMonth: boolean;
};

/**
 * ตาราง 6 สัปดาห์ x 7 วันของเดือนนั้น — ตรึงไว้ 42 ช่องเสมอ
 * เพื่อให้ความสูงปฏิทินไม่กระตุกตอนเปลี่ยนเดือน
 */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      iso: toIso(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}
