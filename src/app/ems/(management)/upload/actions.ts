"use server";

import ExcelJS from "exceljs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { errorMessage, statusUrl } from "@/lib/form-validation";

const PATH = "/ems/upload";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_ROWS = 5_000;
const REQUIRED_HEADERS = ["incident_datetime", "lat", "lng"] as const;
const TRIAGE_VALUES = new Set(["black", "red", "orange", "yellow", "green"]);

type ImportRow = {
  incidentDatetime: Date;
  hn: string | null;
  pname: string | null;
  fname: string | null;
  place: string | null;
  district: string | null;
  subdistrict: string | null;
  drunk: boolean | null;
  triage: string | null;
  lat: number;
  lng: number;
};

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function effectiveValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (!value || typeof value !== "object" || value instanceof Date) return value;

  if ("result" in value) return value.result;
  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText.map((part) => part.text).join("");
  }
  if ("text" in value) return value.text;
  return value;
}

function textValue(cell: ExcelJS.Cell | undefined, label: string, max: number) {
  if (!cell) return null;
  const text = cell.text.trim();
  if (text.length > max) throw new Error(`${label}ยาวเกิน ${max} ตัวอักษร`);
  return text || null;
}

function bangkokWallDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`);
}

function incidentDate(cell: ExcelJS.Cell | undefined) {
  if (!cell) throw new Error("ไม่พบ incident_datetime");
  const value = effectiveValue(cell);

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return bangkokWallDate(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const excelDate = new Date(Math.round((value - 25_569) * 86_400_000));
    return bangkokWallDate(excelDate);
  }

  const text = cell.text.trim();
  const ymd = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  const dmy = text.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );

  let parsed: Date;
  if (ymd) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] = ymd;
    parsed = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+07:00`,
    );
  } else if (dmy) {
    const [, day, month, year, hour = "0", minute = "0", second = "0"] = dmy;
    parsed = new Date(
      `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:${second}+07:00`,
    );
  } else {
    parsed = new Date(text);
  }

  if (!text || Number.isNaN(parsed.getTime())) {
    throw new Error("incident_datetime ไม่ใช่วันที่ที่ถูกต้อง");
  }
  return parsed;
}

function numberValue(
  cell: ExcelJS.Cell | undefined,
  label: string,
  min: number,
  max: number,
) {
  if (!cell) throw new Error(`ไม่พบ ${label}`);
  const value = effectiveValue(cell);
  const number = typeof value === "number" ? value : Number(cell.text.trim().replace(/,/g, ""));
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error(`${label}ต้องเป็นตัวเลขระหว่าง ${min} ถึง ${max}`);
  }
  return number;
}

function drunkValue(cell: ExcelJS.Cell | undefined) {
  if (!cell) return null;
  const text = cell.text.trim().toLowerCase();
  if (!text) return null;
  if (["1", "true", "yes", "y", "ใช่", "เมา"].includes(text)) return true;
  if (["0", "false", "no", "n", "ไม่", "ไม่เมา"].includes(text)) return false;
  throw new Error("drunk ต้องเป็น true/false, 1/0, yes/no หรือ ใช่/ไม่");
}

function triageValue(cell: ExcelJS.Cell | undefined) {
  if (!cell) return null;
  const text = cell.text.trim().toLowerCase();
  if (!text) return null;
  if (!TRIAGE_VALUES.has(text)) {
    throw new Error("triage ต้องเป็น black, red, orange, yellow หรือ green");
  }
  return text;
}

function headerMap(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  const firstRow = worksheet.getRow(1);

  for (let index = 1; index <= Math.min(worksheet.columnCount, 200); index += 1) {
    const header = normalizeHeader(firstRow.getCell(index).text);
    if (header && !headers.has(header)) headers.set(header, index);
  }

  const missing = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missing.length > 0) throw new Error(`ไม่พบคอลัมน์บังคับ: ${missing.join(", ")}`);
  return headers;
}

function cell(row: ExcelJS.Row, headers: Map<string, number>, name: string) {
  const index = headers.get(name);
  return index ? row.getCell(index) : undefined;
}

function parseRows(worksheet: ExcelJS.Worksheet) {
  const headers = headerMap(worksheet);
  const rows: ImportRow[] = [];
  const errors: string[] = [];
  let dataRowCount = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const hasData = [...headers.values()].some((index) => row.getCell(index).text.trim());
    if (!hasData) continue;

    dataRowCount += 1;
    if (dataRowCount > MAX_ROWS) {
      throw new Error(`ไฟล์มีข้อมูลเกิน ${MAX_ROWS.toLocaleString("th-TH")} แถว`);
    }

    try {
      rows.push({
        incidentDatetime: incidentDate(cell(row, headers, "incident_datetime")),
        hn: textValue(cell(row, headers, "hn"), "HN", 50),
        pname: textValue(cell(row, headers, "pname"), "คำนำหน้า", 50),
        fname: textValue(cell(row, headers, "fname"), "ชื่อ", 100),
        place: textValue(cell(row, headers, "place"), "สถานที่", 255),
        district: textValue(cell(row, headers, "district"), "อำเภอ", 100),
        subdistrict: textValue(cell(row, headers, "subdistrict"), "ตำบล", 100),
        drunk: drunkValue(cell(row, headers, "drunk")),
        triage: triageValue(cell(row, headers, "triage")),
        lat: numberValue(cell(row, headers, "lat"), "lat", -90, 90),
        lng: numberValue(cell(row, headers, "lng"), "lng", -180, 180),
      });
    } catch (error) {
      errors.push(`แถว ${rowNumber}: ${errorMessage(error)}`);
    }
  }

  if (rows.length === 0 && errors.length === 0) throw new Error("ไม่พบข้อมูลสำหรับนำเข้า");
  if (errors.length > 0) {
    const visible = errors.slice(0, 8).join(" • ");
    const more = errors.length > 8 ? ` • และอีก ${errors.length - 8} แถว` : "";
    throw new Error(`${visible}${more}`);
  }

  return rows;
}

async function insertRows(rows: ImportRow[]) {
  const chunkSize = 250;

  await prisma.$transaction(
    async (tx) => {
      for (let start = 0; start < rows.length; start += chunkSize) {
        const values = rows.slice(start, start + chunkSize).map((row) => Prisma.sql`(
          ${row.incidentDatetime},
          ${row.hn},
          ${row.pname},
          ${row.fname},
          ${"นามสมมติ"},
          ${row.place},
          ${row.district},
          ${row.subdistrict},
          ${row.drunk},
          CAST(${row.triage} AS triage),
          ST_SetSRID(ST_MakePoint(${row.lng}, ${row.lat}), 4326)
        )`);

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO accident (
            incident_datetime,
            hn,
            pname,
            fname,
            lname,
            place,
            district,
            subdistrict,
            drunk,
            triage,
            place_coordinate
          )
          VALUES ${Prisma.join(values)}
        `);
      }
    },
    { timeout: 60_000 },
  );
}

export async function importAccidents(formData: FormData) {
  let imported = 0;
  let failure: string | null = null;

  try {
    const upload = formData.get("file");
    if (!(upload instanceof File) || upload.size === 0) throw new Error("กรุณาเลือกไฟล์ .xlsx");
    if (!upload.name.toLowerCase().endsWith(".xlsx")) throw new Error("รองรับเฉพาะไฟล์ .xlsx");
    if (upload.size > MAX_FILE_SIZE) throw new Error("ไฟล์มีขนาดเกิน 8 MB");

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await upload.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error("ไม่พบ worksheet ในไฟล์");

    const rows = parseRows(worksheet);
    await insertRows(rows);
    imported = rows.length;
  } catch (error) {
    failure = errorMessage(error);
  }

  if (failure) redirect(statusUrl(PATH, "error", failure));
  revalidatePath("/ems");
  revalidatePath(PATH);
  redirect(statusUrl(PATH, "success", `นำเข้าข้อมูลสำเร็จ ${imported.toLocaleString("th-TH")} แถว`));
}
